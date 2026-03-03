# FILE: app/services/sandbox_service.py

from app.models.execution import ExecutionRequest, ExecutionResult
from app.security.validator import SecurityValidator
from app.executor.manager import ExecutionManager
from app.utils.logger import get_logger

logger = get_logger(__name__)


class SandboxService:
    """
    Service layer — orchestrates validation and execution.
    Sits between API routes and the execution engine.

    Responsibilities:
      1. Validate language + workspace (security checks)
      2. Delegate to ExecutionManager (Docker execution)
      3. Catch ALL exceptions — always returns ExecutionResult, never raises
    """

    @staticmethod
    async def run_execution(request: ExecutionRequest) -> ExecutionResult:

        logger.info(
            "sandbox_execution_requested",
            extra={
                "session_id": request.sessionId,
                "language": request.language,
                "workspace": request.workspacePath,
                "timeout": request.timeout,
            }
        )

        try:
            # Validate language (whitelist check)
            SecurityValidator.validate_language(request.language)

            # Validate workspace — returns safe normalized path
            safe_workspace_path = SecurityValidator.validate_workspace(
                session_id=request.sessionId,
                workspace_path=request.workspacePath,
                language=request.language,
            )

            # Execute in Docker
            result = await ExecutionManager.execute(
                session_id=request.sessionId,
                workspace_path=safe_workspace_path,
                language=request.language,
                timeout=request.timeout,
            )

            logger.info(
                "sandbox_execution_finished",
                extra={
                    "session_id": request.sessionId,
                    "status": result.status,
                    "exit_code": result.exitCode,
                    "execution_time": result.executionTime,
                }
            )
            return result

        except ValueError as ve:
            # Validation error — bad request from backend
            logger.warning(
                "sandbox_validation_error",
                extra={"session_id": request.sessionId, "error": str(ve)}
            )
            return ExecutionResult(
                status="failed",
                stdout="",
                stderr=str(ve),
                exitCode=-1,
                executionTime=0.0,
                error=str(ve),
            )

        except Exception as e:
            # Infrastructure error — Docker problem, disk issue, etc.
            # Log real error internally, return generic message externally
            logger.error(
                "sandbox_system_error",
                extra={
                    "session_id": request.sessionId,
                    "error": str(e),
                    "error_type": type(e).__name__,
                }
            )
            return ExecutionResult(
                status="failed",
                stdout="",
                stderr="Sandbox internal error. Check service logs.",
                exitCode=-1,
                executionTime=0.0,
                error=str(e),
            )