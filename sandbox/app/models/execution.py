# FILE: app/models/execution.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.config.settings import settings


class ExecutionRequest(BaseModel):
    """
    Schema for what Spring Boot backend sends to POST /sandbox/execute.

    Pydantic automatically:
      - Validates types
      - Runs @field_validator methods
      - Returns 422 HTTP error if validation fails (no code needed)
    """

    sessionId: str = Field(
        ...,
        description="Unique session UUID from backend",
        min_length=1,
        max_length=100
    )

    workspacePath: str = Field(
        ...,
        description="Absolute path to workspace folder containing code files",
        min_length=1
    )

    language: str = Field(
        ...,
        description="Programming language. Must be in allowed whitelist."
    )

    timeout: int = Field(
        default=settings.DEFAULT_TIMEOUT_SECONDS,
        description="Max execution seconds before container is killed",
        ge=1,
        le=settings.MAX_EXECUTION_TIME
    )

    @field_validator("language")
    @classmethod
    def language_must_be_allowed(cls, v: str) -> str:
        normalized = v.lower().strip()
        if normalized not in settings.ALLOWED_LANGUAGES:
            raise ValueError(
                f"Language '{v}' not supported. Allowed: {settings.ALLOWED_LANGUAGES}"
            )
        return normalized

    @field_validator("sessionId")
    @classmethod
    def session_id_must_be_safe(cls, v: str) -> str:
        # Prevent path traversal via sessionId
        forbidden = ["/", "\\", "..", "<", ">", "|", ";", "&"]
        for char in forbidden:
            if char in v:
                raise ValueError(f"sessionId contains forbidden character: '{char}'")
        return v


class ExecutionResult(BaseModel):
    """
    Schema for what sandbox returns to Spring Boot backend.

    status values:
      "completed" — container ran and exited (exitCode may still be non-zero for runtime errors)
      "timeout"   — container killed for exceeding timeout (infinite loop protection)
      "failed"    — infrastructure failure (Docker error, validation failure)
    """

    status: str = Field(..., description="completed | timeout | failed")
    stdout: str = Field(default="", description="Program standard output")
    stderr: str = Field(default="", description="Program errors / compiler output / tracebacks")
    exitCode: int = Field(default=0, description="0=success, non-zero=failure, -1=sandbox error")
    executionTime: float = Field(default=0.0, description="Wall-clock seconds from start to finish")
    error: Optional[str] = Field(default=None, description="Internal sandbox error message")