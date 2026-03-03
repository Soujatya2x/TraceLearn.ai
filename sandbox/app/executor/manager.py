# FILE: app/executor/manager.py

import asyncio
import time
import uuid
import docker.errors
from app.adapters.base import BaseExecutor
from app.adapters.python_adapter import PythonExecutor
from app.adapters.java_adapter import JavaExecutor
from app.adapters.node_adapter import NodeExecutor
from app.adapters.go_adapter import GoExecutor
from app.adapters.rust_adapter import RustExecutor
from app.docker.client import DockerRunner
from app.models.execution import ExecutionResult
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Language registry — add new languages here only. Nothing else needs to change.
ADAPTER_REGISTRY: dict[str, type[BaseExecutor]] = {
    "python": PythonExecutor,
    "java":   JavaExecutor,
    "node":   NodeExecutor,
    "go":     GoExecutor,
    "rust":   RustExecutor,
}


class ExecutionManager:

    @staticmethod
    def get_adapter(language: str, workspace_path: str, timeout: int) -> BaseExecutor:
        """Instantiates the correct language adapter."""
        adapter_cls = ADAPTER_REGISTRY.get(language.lower())
        if not adapter_cls:
            raise ValueError(f"No execution adapter for language: '{language}'")
        return adapter_cls(workspace_path, timeout)

    @staticmethod
    async def execute(
        session_id: str,
        workspace_path: str,
        language: str,
        timeout: int,
    ) -> ExecutionResult:
        """
        Full execution lifecycle — async to support concurrent requests.

        Key async concepts used here:
          asyncio.to_thread(container.wait):
            docker-py's wait() is BLOCKING — it freezes the thread until container exits.
            to_thread() runs it in a thread pool so the event loop stays free.
            Other requests can be processed while we wait for this container.

          asyncio.wait_for(..., timeout=N):
            Wraps the to_thread coroutine with a real timeout.
            If container doesn't finish in N seconds → raises asyncio.TimeoutError.
            We catch it, kill the container, return status="timeout".

          finally block:
            Runs NO MATTER WHAT — success, timeout, or exception.
            Guarantees container is always destroyed. No orphans.
        """
        start_time = time.monotonic()
        short_id = str(uuid.uuid4())[:8]
        container_name = f"sandbox_{session_id[:8]}_{short_id}"

        adapter = ExecutionManager.get_adapter(language, workspace_path, timeout)
        effective_timeout = adapter.get_timeout()
        runner = DockerRunner()
        container = None

        logger.info(
            "execution_starting",
            extra={
                "session_id": session_id,
                "language": language,
                "image": adapter.get_image(),
                "timeout": effective_timeout,
                "container_name": container_name,
            }
        )

        try:
            # ── Step 1: Create isolated container ────────────────────────────
            container = runner.create_container(
                image=adapter.get_image(),
                command=adapter.get_command(),
                workspace_path=workspace_path,
                container_name=container_name,
            )

            # ── Step 2: Wait with timeout watchdog ────────────────────────────
            status = "completed"
            exit_code = 0

            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(container.wait),
                    timeout=effective_timeout,
                )
                exit_code = result.get("StatusCode", 0)
                logger.info(
                    "execution_completed",
                    extra={"session_id": session_id, "exit_code": exit_code}
                )

            except asyncio.TimeoutError:
                logger.warning(
                    "execution_timeout",
                    extra={
                        "session_id": session_id,
                        "timeout_seconds": effective_timeout,
                    }
                )
                try:
                    container.kill()
                except docker.errors.APIError:
                    pass  # Container may have already exited
                status = "timeout"
                exit_code = -1

            # ── Step 3: Capture stdout and stderr ─────────────────────────────
            try:
                container.reload()
            except Exception:
                pass

            stdout_text = container.logs(
                stdout=True, stderr=False
            ).decode("utf-8", errors="replace").strip()

            stderr_text = container.logs(
                stdout=False, stderr=True
            ).decode("utf-8", errors="replace").strip()

            execution_time = round(time.monotonic() - start_time, 3)

            logger.info(
                "execution_result_captured",
                extra={
                    "session_id": session_id,
                    "status": status,
                    "exit_code": exit_code,
                    "execution_time": execution_time,
                    "stdout_length": len(stdout_text),
                    "stderr_length": len(stderr_text),
                }
            )

            return ExecutionResult(
                status=status,
                stdout=stdout_text,
                stderr=stderr_text,
                exitCode=exit_code,
                executionTime=execution_time,
            )

        except Exception as e:
            execution_time = round(time.monotonic() - start_time, 3)
            logger.error(
                "execution_failed",
                extra={"session_id": session_id, "error": str(e)}
            )
            return ExecutionResult(
                status="failed",
                stdout="",
                stderr=str(e),
                exitCode=-1,
                executionTime=execution_time,
                error=str(e),
            )

        finally:
            # ── Always destroy container — no matter what happened above ──────
            if container is not None:
                runner.destroy_container(container)