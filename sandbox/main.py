# FILE: main.py

import asyncio
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.routes import router as sandbox_router
from app.cleanup.scheduler import CleanupScheduler
from app.docker.client import get_docker_client
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ── Paths that bypass authentication ──────────────────────────────────────────
# The ALB health check hits /sandbox/health every ~30s without credentials.
# /sandbox/languages is informational and safe to expose.
# All other paths — especially /sandbox/execute — require the secret.
_UNAUTHENTICATED_PATHS = {"/sandbox/health", "/sandbox/languages"}


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
            # Log auth state at startup so it's visible in CloudWatch
            "internal_auth_enabled": settings.REQUIRE_INTERNAL_AUTH and bool(settings.INTERNAL_SECRET),
        }
    )

    # Warn loudly if auth is not configured — this is the most dangerous misconfiguration.
    if settings.REQUIRE_INTERNAL_AUTH and not settings.INTERNAL_SECRET:
        logger.warning(
            "sandbox_auth_not_configured",
            extra={
                "message": (
                    "REQUIRE_INTERNAL_AUTH is True but INTERNAL_SECRET is empty. "
                    "All requests to /sandbox/execute are currently unprotected. "
                    "Set INTERNAL_SECRET env var (openssl rand -hex 32) before production."
                )
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
    # Internal service — Swagger docs disabled entirely.
    # Exposing API docs for an unauthenticated internal service leaks the
    # execution contract to anyone who can reach the port.
    # LOW-6 audit finding: the old "production" string match was fragile.
    docs_url=None,
    redoc_url=None,
)


# ── Internal Secret Middleware ─────────────────────────────────────────────────
# Placed BEFORE route registration so it runs on every request including /execute.
#
# Design decisions:
# 1. Middleware (not a FastAPI dependency) — applies globally without touching
#    every route individually. Adding a new route cannot accidentally skip auth.
# 2. Auth is skipped when INTERNAL_SECRET is empty — this lets developers run
#    locally without configuring a secret. REQUIRE_INTERNAL_AUTH=False is a
#    separate escape hatch for test environments.
# 3. Returns plain JSONResponse (not HTTPException) from middleware — HTTPException
#    is only caught by FastAPI exception handlers registered on the app, not in
#    middleware. JSONResponse guarantees the 401 is always returned correctly.
# 4. Logs the requesting IP on failure — useful for detecting port exposure.

@app.middleware("http")
async def verify_internal_secret(request: Request, call_next):
    # Health check and language list bypass auth — ALB needs /health without creds.
    if request.url.path in _UNAUTHENTICATED_PATHS:
        return await call_next(request)

    # Auth is only enforced when both flags are set:
    #   REQUIRE_INTERNAL_AUTH=True  (intent to enforce)
    #   INTERNAL_SECRET non-empty   (actual secret configured)
    # If INTERNAL_SECRET is empty we let the request through but already
    # logged a startup warning about the misconfiguration.
    if settings.REQUIRE_INTERNAL_AUTH and settings.INTERNAL_SECRET:
        provided = request.headers.get("X-Internal-Secret", "")

        if provided != settings.INTERNAL_SECRET:
            client_ip = request.client.host if request.client else "unknown"
            logger.warning(
                "unauthorized_sandbox_request",
                extra={
                    "path": request.url.path,
                    "ip": client_ip,
                    "method": request.method,
                    # Do NOT log the provided secret — it could be a near-miss of the real one
                }
            )
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized"},
            )

    return await call_next(request)


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