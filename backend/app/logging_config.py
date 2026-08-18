"""
AgentShield Structured Logging Configuration.

Sets up JSON-structured logging for production observability.

WHY structured JSON logs:
- Machine-parseable by log aggregators (ELK, CloudWatch, Datadog)
- Supports correlation IDs for tracing requests across services
- Structured JSON logging with request IDs
- Machine-readable logs for SIEM and observability tools
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class JSONFormatter(logging.Formatter):
    """
    Format log records as JSON objects.

    Each log line is a single JSON object with:
    - timestamp (ISO 8601)
    - level
    - logger name
    - message
    - any extra fields (request_id, agent_id, etc.)
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields passed via logging.info("msg", extra={...})
        # Common extras: request_id, agent_id, tool, decision
        for key in (
            "request_id",
            "agent_id",
            "tool",
            "decision",
            "session_id",
            "duration_ms",
            "status_code",
            "error",
            "component",
        ):
            value = getattr(record, key, None)
            if value is not None:
                log_data[key] = value

        # Add exception info if present
        if record.exc_info and record.exc_info[1]:
            log_data["exception"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
            }

        return json.dumps(log_data, default=str)


def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure the root logger with JSON formatting.

    Args:
        log_level: Minimum log level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    """
    # Create JSON handler for stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger.

    Usage:
        logger = get_logger(__name__)
        logger.info("Tool call intercepted", extra={"agent_id": "support-agent", "tool": "customer_db"})
    """
    return logging.getLogger(name)
