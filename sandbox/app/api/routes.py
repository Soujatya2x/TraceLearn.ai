# FILE: app/api/routes.py

from fastapi import APIRouter, HTTPException
from app.models.execution import ExecutionRequest, ExecutionResult
from app.services.sandbox_service import SandboxService
from app.security.validator import EXECUTION_FILE_MAP
from app.docker.client import get_docker_client
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/execute",
    response_model=ExecutionResult,
    summary="Execute code in isolated sandbox",
    description=(
        "Receives workspace path and language from Spring Boot backend. "
        "Runs code in Docker container with full security isolation. "
        "Called ONLY by System Brain — never by frontend or AI agent."
    ),
)
async def execute_code(request: ExecutionRequest) -> ExecutionResult:
    """
    Main execution endpoint.
    FastAPI automatically:
      - Parses JSON body
      - Validates against ExecutionRequest (including custom validators)
      - Returns 422 if validation fails
    We delegate everything to SandboxService.
    """
    logger.info(
        "execute_endpoint_called",
        extra={"session_id": request.sessionId, "language": request.language}
    )
    return await SandboxService.run_execution(request)


@router.get(
    "/health",
    summary="Health check — used by AWS load balancer",
    description="Returns 200 if healthy. Returns 503 if Docker is unreachable.",
)
async def health_check() -> dict:
    """
    AWS Application Load Balancer calls this every ~30 seconds.
    If non-200 is returned, instance is marked unhealthy and removed from rotation.
    We verify Docker is reachable — if Docker is down, the service is useless.
    """
    try:
        client = get_docker_client()
        client.ping()
        docker_status = "connected"
    except Exception as e:
        logger.error("health_check_docker_failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=503,
            detail=f"Docker daemon unreachable: {str(e)}"
        )

    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "environment": settings.ENVIRONMENT,
        "docker": docker_status,
        "supported_languages": settings.ALLOWED_LANGUAGES,
    }


@router.get(
    "/languages",
    summary="List supported execution languages and their expected filenames",
)
async def list_languages() -> dict:
    """Returns language whitelist and the filename backend must write for each."""
    return {
        "supported_languages": settings.ALLOWED_LANGUAGES,
        "execution_files": EXECUTION_FILE_MAP,
    }