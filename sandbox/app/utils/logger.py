# FILE: app/utils/logger.py

import logging
import json
import sys
from datetime import datetime, timezone
from app.config.settings import settings


class JSONFormatter(logging.Formatter):
    """
    Outputs every log line as a JSON object.
    Required for AWS CloudWatch Logs Insights to filter/query logs by field.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": settings.SERVICE_NAME,
            "version": settings.SERVICE_VERSION,
            "environment": settings.ENVIRONMENT,
            "logger": record.name,
            "message": record.getMessage(),
        }

        excluded_keys = {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message", "taskName"
        }
        for key, value in record.__dict__.items():
            if key not in excluded_keys:
                log_entry[key] = value

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def get_logger(name: str) -> logging.Logger:
    """
    Returns a structured JSON logger.
    Usage: logger = get_logger(__name__)
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger