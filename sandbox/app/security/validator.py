# FILE: app/security/validator.py

import os
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Backend ↔ Sandbox contract: backend MUST save code with these exact filenames.
# Sandbox looks for this file in the workspace. If missing → reject execution.
EXECUTION_FILE_MAP = {
    "python": "main.py",
    "java":   "Main.java",
    "node":   "index.js",
    "go":     "main.go",
    "rust":   "main.rs",
}


class SecurityValidator:

    @staticmethod
    def validate_language(language: str) -> str:
        """
        Rejects any language not in ALLOWED_LANGUAGES whitelist.
        Prevents injection like: language = "python; rm -rf /"
        """
        normalized = language.lower().strip()
        if normalized not in settings.ALLOWED_LANGUAGES:
            raise ValueError(
                f"Unsupported language: '{language}'. "
                f"Allowed: {settings.ALLOWED_LANGUAGES}"
            )
        logger.info("language_validated", extra={"language": normalized})
        return normalized

    @staticmethod
    def validate_workspace(session_id: str, workspace_path: str, language: str) -> str:
        """
        Full workspace security check. Returns safe normalized path on success.

        Checks performed:
          1. Path resolves inside WORKSPACE_ROOT (prevents path traversal attacks)
          2. Directory actually exists
          3. Expected execution file exists (main.py, Main.java, etc.)
          4. No files exceed MAX_FILE_SIZE_MB
        """

        # os.path.realpath resolves BOTH symlinks AND ../ sequences
        # "/workspace/../etc" becomes "/etc" — which fails check below
        normalized_path = os.path.realpath(workspace_path)
        normalized_root = os.path.realpath(settings.WORKSPACE_ROOT)

        # Must be inside workspace root
        if not normalized_path.startswith(normalized_root + os.sep) and \
           normalized_path != normalized_root:
            logger.warning(
                "path_traversal_attempt",
                extra={
                    "session_id": session_id,
                    "attempted_path": workspace_path,
                    "normalized": normalized_path,
                    "workspace_root": normalized_root,
                }
            )
            raise ValueError(
                f"Security violation: workspace path is outside allowed root. "
                f"Attempted: {workspace_path}"
            )

        # Directory must exist
        if not os.path.isdir(normalized_path):
            raise ValueError(f"Workspace directory does not exist: {normalized_path}")

        # Expected execution file must exist
        # Backend must write this before calling sandbox
        expected_file = EXECUTION_FILE_MAP.get(language.lower())
        if expected_file:
            execution_file_path = os.path.join(normalized_path, expected_file)
            if not os.path.isfile(execution_file_path):
                raise ValueError(
                    f"Expected execution file '{expected_file}' not found in workspace. "
                    f"Backend must write this file before calling sandbox."
                )

        # Check file sizes — reject oversized files before they reach Docker
        SecurityValidator._check_file_sizes(normalized_path)

        logger.info(
            "workspace_validated",
            extra={"session_id": session_id, "workspace_path": normalized_path, "language": language}
        )
        return normalized_path

    @staticmethod
    def _check_file_sizes(workspace_path: str) -> None:
        """Rejects workspaces containing files larger than MAX_FILE_SIZE_MB."""
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        for filename in os.listdir(workspace_path):
            filepath = os.path.join(workspace_path, filename)
            if os.path.isfile(filepath):
                size = os.path.getsize(filepath)
                if size > max_bytes:
                    raise ValueError(
                        f"File '{filename}' exceeds size limit "
                        f"({size // (1024 * 1024)}MB > {settings.MAX_FILE_SIZE_MB}MB)"
                    )