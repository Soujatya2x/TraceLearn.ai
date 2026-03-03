# FILE: main.py

import asyncio
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.routes import router as sandbox_router
from app.cleanup.scheduler import CleanupScheduler
from app.docker.client import get_docker_client
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Modern FastAPI lifespan manager.
    Code before yield = startup logic.
    Code after yield = shutdown logic.

    Replaces the deprecated @app.on_event("startup") / @app.on_event("shutdown").
    """

    # ── STARTUP ───────────────────────────────────────────────────────────────
    logger.info(
        "sandbox_starting",
        extra={
            "service": settings.SERVICE_NAME,
            "version": settings.SERVICE_VERSION,
            "environment": settings.ENVIRONMENT,
            "workspace_root": settings.WORKSPACE_ROOT,
            "allowed_languages": settings.ALLOWED_LANGUAGES,
        }
    )

    # Verify Docker is reachable — fail fast strategy.
    # If Docker is down at startup, there's no point serving requests.
    try:
        client = get_docker_client()
        client.ping()
        logger.info("docker_connection_verified")
    except Exception as e:
        logger.error("docker_not_reachable_at_startup", extra={"error": str(e)})
        sys.exit(1)

    # Start background cleanup task (runs concurrently with web server)
    cleanup_task = asyncio.create_task(CleanupScheduler.start())
    logger.info("cleanup_scheduler_launched")

    yield  # ← Application runs here, handling requests

    # ── SHUTDOWN ──────────────────────────────────────────────────────────────
    logger.info("sandbox_shutting_down")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        logger.info("cleanup_scheduler_stopped")


# Create FastAPI application
app = FastAPI(
    title="TraceLearn.ai Sandbox Executor",
    description=(
        "Secure isolated code execution service for TraceLearn.ai. "
        "Accepts execution jobs from Spring Boot System Brain only. "
        "Runs user code in ephemeral Docker containers with full security isolation."
    ),
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
    # Disable Swagger docs in production (internal service — no public API docs needed)
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
)

# Register all routes — prefix means routes.py "/execute" becomes "/sandbox/execute"
app.include_router(sandbox_router, prefix="/sandbox", tags=["Sandbox Execution"])


# Development runner — only runs when you do: python main.py
# In production use: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level="info",
        access_log=True,
    )