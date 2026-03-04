# FILE: app/docker/client.py

import docker
import docker.errors
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_docker_client() -> docker.DockerClient:
    """
    Connects to Docker daemon via /var/run/docker.sock.
    On AWS EC2: sandbox container mounts HOST socket → creates sibling containers.
    This is Docker-out-of-Docker (DoD), safer than Docker-in-Docker (DinD).
    """
    try:
        client = docker.from_env()
        client.ping()
        return client
    except docker.errors.DockerException as e:
        logger.error("docker_connection_failed", extra={"error": str(e)})
        raise RuntimeError(f"Cannot connect to Docker daemon: {str(e)}")


class DockerRunner:
    """Creates, monitors, and destroys isolated execution containers."""

    def __init__(self):
        self.client = get_docker_client()

    def ensure_image(self, image: str) -> None:
        """
        Verifies image exists locally. Pulls if AUTO_PULL_IMAGES=True.
        In production: pre-pull images on EC2 AMI, set AUTO_PULL_IMAGES=False.
        """
        try:
            self.client.images.get(image)
            logger.info("docker_image_found", extra={"image": image})
        except docker.errors.ImageNotFound:
            if settings.AUTO_PULL_IMAGES:
                logger.info("docker_image_pulling", extra={"image": image})
                self.client.images.pull(image)
                logger.info("docker_image_pulled", extra={"image": image})
            else:
                raise RuntimeError(
                    f"Image '{image}' not found locally. "
                    f"Pre-pull images on EC2 during AMI setup."
                )

    def create_container(
        self,
        image: str,
        command: str,
        workspace_path: str,
        container_name: str,
    ) -> docker.models.containers.Container:
        """
        Creates container with full security isolation.

        Security constraints applied:
          network_mode="none"              → No internet access at all
          mem_limit="512m"                 → 512MB RAM cap — prevents OOM attacks
          nano_cpus=1_000_000_000          → 1 CPU core max — prevents CPU exhaustion
          pids_limit=64                    → Max 64 processes — stops fork bombs
          read_only=True                   → Container filesystem is read-only
          security_opt=no-new-privileges   → No privilege escalation inside container
          cap_drop=ALL                     → Zero Linux capabilities granted
          tmpfs /tmp                       → 32MB RAM disk for temp files (interpreted languages)
                                             noexec + nosuid = full restriction for Python/Node
          tmpfs /build                     → 64MB RAM disk for compiled language output
                                             nosuid only — binaries here MUST be executable
                                             Java .class files, Go binary, Rust binary all land here
                                             Isolated from /tmp so /tmp stays fully restricted
          remove=False                     → We remove manually after reading logs
        """
        self.ensure_image(image)

        logger.info(
            "container_creating",
            extra={
                "container_name": container_name,
                "image": image,
                "command": command,
                "workspace": workspace_path,
            }
        )

        container = self.client.containers.run(
            image=image,
            command=command,
            name=container_name,
            volumes={workspace_path: {"bind": "/app", "mode": "ro"}},
            working_dir="/app",
            detach=True,
            network_mode="none" if settings.DOCKER_NETWORK_DISABLED else "bridge",
            mem_limit=settings.MAX_MEMORY_LIMIT,
            nano_cpus=settings.MAX_CPUS,
            pids_limit=settings.PIDS_LIMIT,
            read_only=True,
            security_opt=["no-new-privileges"],
            cap_drop=["ALL"],
            tmpfs={
                # MEDIUM-8 FIX: Two-mount strategy.
                #
                # /tmp  — small, fully restricted. Python/Node temp writes land here.
                #         noexec: nothing written here can be executed (XSS/RCE hardening).
                #         nosuid: no setuid binaries.
                #
                # /build — compilation output for Java, Go, Rust.
                #         nosuid only — binaries MUST be executable here.
                #         Java: javac writes .class files → java reads from /build
                #         Go:   go run compiles to /build/main → executes from /build
                #         Rust: rustc -o /build/main → /build/main is executed
                #         64MB is generous for a single-file program binary.
                #         noexec intentionally absent — that's the whole point of this mount.
                "/tmp":   "size=32m,noexec,nosuid",
                "/build": "size=64m,nosuid",
            },
            remove=False,
        )

        logger.info(
            "container_created",
            extra={
                "container_name": container_name,
                "container_id": container.id[:12],
            }
        )
        return container

    def destroy_container(self, container: docker.models.containers.Container) -> None:
        """
        Forcefully removes container.
        Called in finally block in manager.py — ALWAYS executes, even after exceptions.
        force=True removes even if container is still running (post-timeout kill).
        """
        try:
            container.remove(force=True)
            logger.info("container_destroyed", extra={"container_name": container.name})
        except docker.errors.NotFound:
            pass  # Already removed — this is fine
        except Exception as e:
            logger.error(
                "container_destroy_failed",
                extra={"container_name": container.name, "error": str(e)}
            )