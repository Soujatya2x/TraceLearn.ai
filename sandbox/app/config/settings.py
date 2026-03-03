# FILE: app/config/settings.py

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Service Identity ───────────────────────────────────────────────────────
    ENVIRONMENT: str = "production"
    SERVICE_NAME: str = "tracelearn-sandbox"
    SERVICE_VERSION: str = "1.0.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # ── Workspace ─────────────────────────────────────────────────────────────
    # Backend writes code files here. Sandbox only reads from here — never writes.
    WORKSPACE_ROOT: str = "/workspace"

    # ── Docker Resource Limits (applied per container) ────────────────────────
    MAX_MEMORY_LIMIT: str = "512m"
    MAX_CPUS: int = 1_000_000_000       # 1 billion nano-cpus = 1 CPU core
    PIDS_LIMIT: int = 64                # Prevents fork bombs
    DOCKER_NETWORK_DISABLED: bool = True

    # ── Execution Timeouts ────────────────────────────────────────────────────
    DEFAULT_TIMEOUT_SECONDS: int = 10
    MAX_EXECUTION_TIME: int = 60        # Hard ceiling enforced by Pydantic validator

    # ── File Safety ───────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10

    # ── Language Whitelist ────────────────────────────────────────────────────
    ALLOWED_LANGUAGES: List[str] = ["python", "java", "node", "go", "rust"]

    # ── Cleanup Scheduler ─────────────────────────────────────────────────────
    CLEANUP_INTERVAL_SECONDS: int = 300     # Every 5 minutes
    CONTAINER_MAX_AGE_SECONDS: int = 600    # Kill containers running > 10 minutes

    # ── Docker Image Pull ─────────────────────────────────────────────────────
    # Set False in production — pre-pull images during EC2 AMI baking
    AUTO_PULL_IMAGES: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Single shared instance imported everywhere
settings = Settings()