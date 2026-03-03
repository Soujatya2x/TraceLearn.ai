# FILE: app/cleanup/scheduler.py

import asyncio
import docker
import docker.errors
from datetime import datetime, timezone
from app.docker.client import get_docker_client
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CleanupScheduler:
    """
    Background asyncio Task — runs every CLEANUP_INTERVAL_SECONDS.

    Purpose:
      Safety net for orphaned containers.
      In normal flow, ExecutionManager's finally block destroys containers.
      But if the sandbox service itself crashed mid-execution, finally never runs.
      This scheduler finds and removes any containers left behind.

    Two types of cleanup:
      1. exited/dead containers — remove them (they're already stopped)
      2. running containers older than CONTAINER_MAX_AGE_SECONDS — kill + remove
         (shouldn't happen with timeout watchdog, but defensive programming)
    """

    @staticmethod
    async def start() -> None:
        """Infinite loop. Runs cleanup every CLEANUP_INTERVAL_SECONDS."""
        logger.info(
            "cleanup_scheduler_started",
            extra={"interval_seconds": settings.CLEANUP_INTERVAL_SECONDS}
        )
        while True:
            try:
                await CleanupScheduler._run_cleanup()
            except Exception as e:
                # Never let cleanup loop crash — just log and keep going
                logger.error("cleanup_cycle_error", extra={"error": str(e)})
            await asyncio.sleep(settings.CLEANUP_INTERVAL_SECONDS)

    @staticmethod
    async def _run_cleanup() -> None:
        """
        Runs blocking docker-py calls in a thread.
        asyncio.to_thread() prevents blocking the event loop during cleanup.
        """
        await asyncio.to_thread(CleanupScheduler._sync_cleanup)

    @staticmethod
    def _sync_cleanup() -> None:
        """Synchronous cleanup logic — lists and removes orphaned sandbox containers."""
        try:
            client = get_docker_client()

            # Only look at containers whose name contains "sandbox_"
            containers = client.containers.list(
                all=True,
                filters={"name": "sandbox_"}
            )

            cleaned_count = 0
            for container in containers:
                try:
                    # Remove terminated containers
                    if container.status in ("exited", "dead"):
                        container_name = container.name
                        container.remove(force=True)
                        cleaned_count += 1
                        logger.info(
                            "orphan_container_removed",
                            extra={"container_name": container_name}
                        )

                    # Kill containers running beyond max age
                    elif container.status == "running":
                        created_str = container.attrs.get("Created", "")
                        if created_str:
                            created_dt = datetime.fromisoformat(
                                created_str.replace("Z", "+00:00")
                            )
                            age_seconds = (
                                datetime.now(timezone.utc) - created_dt
                            ).total_seconds()

                            if age_seconds > settings.CONTAINER_MAX_AGE_SECONDS:
                                logger.warning(
                                    "container_exceeded_max_age",
                                    extra={
                                        "container_name": container.name,
                                        "age_seconds": round(age_seconds),
                                        "max_age_seconds": settings.CONTAINER_MAX_AGE_SECONDS,
                                    }
                                )
                                container.kill()
                                container.remove(force=True)
                                cleaned_count += 1

                except docker.errors.NotFound:
                    pass  # Container removed between list and delete — fine
                except Exception as e:
                    logger.error(
                        "container_cleanup_error",
                        extra={
                            "container_name": getattr(container, "name", "unknown"),
                            "error": str(e),
                        }
                    )

            if cleaned_count > 0:
                logger.info(
                    "cleanup_cycle_completed",
                    extra={"containers_removed": cleaned_count}
                )

        except Exception as e:
            logger.error("cleanup_docker_error", extra={"error": str(e)})