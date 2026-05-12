"""Structured JSON logging utilities for the MAIT backend."""

from __future__ import annotations

import hashlib
import json
import logging
import sys
from collections import deque
from typing import Any, Deque, Dict, Iterable, Optional

try:
    from pythonjsonlogger import jsonlogger
except ModuleNotFoundError:  # pragma: no cover - local fallback until requirements are installed
    class _FallbackJsonFormatter(logging.Formatter):
        def __init__(self, *args: Any, rename_fields: Optional[Dict[str, str]] = None, **kwargs: Any):
            super().__init__(*args, **kwargs)
            self.rename_fields = rename_fields or {}

        def format(self, record: logging.LogRecord) -> str:
            event = {
                "asctime": self.formatTime(record, self.datefmt),
                "levelname": record.levelname,
                "name": record.name,
                "message": record.getMessage(),
            }
            if record.exc_info:
                event["exc_info"] = self.formatException(record.exc_info)
            for key, value in record.__dict__.items():
                if key not in _RESERVED_ATTRS and not key.startswith("_"):
                    event[key] = value
            for old_key, new_key in self.rename_fields.items():
                if old_key in event:
                    event[new_key] = event.pop(old_key)
            return json.dumps(event, default=str, ensure_ascii=False)

    class jsonlogger:  # type: ignore[no-redef]
        JsonFormatter = _FallbackJsonFormatter


_RESERVED_ATTRS = set(logging.makeLogRecord({}).__dict__.keys())
_RECENT_EVENTS: Deque[Dict[str, Any]] = deque(maxlen=1000)


def hash_identifier(value: Optional[Any]) -> Optional[str]:
    """Return a stable non-reversible short hash for user/document identifiers."""
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def redact_ip(ip_address: Optional[str]) -> Optional[str]:
    """Redact the last octet of IPv4 addresses and the tail of IPv6 addresses."""
    if not ip_address:
        return None
    ip = ip_address.split(",", 1)[0].strip()
    if not ip:
        return None
    if "." in ip:
        parts = ip.split(".")
        if len(parts) == 4:
            parts[-1] = "x"
            return ".".join(parts)
    if ":" in ip:
        parts = ip.split(":")
        if len(parts) > 2:
            return ":".join(parts[:4] + ["x"])
    return "[REDACTED]"


def text_preview(value: Optional[Any], limit: int = 500) -> Dict[str, Any]:
    """Log a bounded preview plus the original length without dumping huge payloads."""
    if value is None:
        return {"preview": None, "length": 0, "truncated": False}
    text = str(value)
    return {
        "preview": text[:limit],
        "length": len(text),
        "truncated": len(text) > limit,
    }


def usage_metadata_from_response(response: Any) -> Dict[str, Optional[int]]:
    """Extract token counts from Google GenAI responses when the SDK exposes them."""
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        return {
            "input_tokens": None,
            "output_tokens": None,
            "total_tokens": None,
        }

    return {
        "input_tokens": getattr(usage, "prompt_token_count", None),
        "output_tokens": getattr(usage, "candidates_token_count", None),
        "total_tokens": getattr(usage, "total_token_count", None),
    }


def request_context(request: Any) -> Dict[str, Any]:
    """Build a privacy-preserving request context for API/error logs."""
    headers = getattr(request, "headers", {}) or {}
    client = getattr(request, "client", None)
    client_host = getattr(client, "host", None)
    forwarded_for = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
    student_id = headers.get("x-student-id") or headers.get("X-Student-Id")
    tutor_id = headers.get("x-tutor-id") or headers.get("X-Tutor-Id")

    query_params = getattr(request, "query_params", {}) or {}
    query_keys: Iterable[str] = []
    try:
        query_keys = sorted(query_params.keys())
        student_id = student_id or query_params.get("student_id")
    except AttributeError:
        query_keys = []

    url = getattr(request, "url", None)
    path = getattr(url, "path", None)

    return {
        "method": getattr(request, "method", None),
        "path": path,
        "query_keys": list(query_keys),
        "student_id_hash": hash_identifier(student_id),
        "tutor_id_hash": hash_identifier(tutor_id),
        "ip_redacted": redact_ip(forwarded_for or client_host),
    }


def sanitized_validation_errors(errors: Iterable[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Keep validation diagnostics useful without logging raw submitted values."""
    sanitized = []
    for err in errors:
        sanitized.append({
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type"),
        })
    return sanitized


class RecentEventHandler(logging.Handler):
    """In-memory tail of recent structured events for admin debugging."""

    def emit(self, record: logging.LogRecord) -> None:
        event = {
            "timestamp": self.formatter.formatTime(record) if self.formatter else None,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED_ATTRS and not key.startswith("_"):
                event[key] = value
        _RECENT_EVENTS.append(event)


def configure_logging() -> None:
    """Configure root logging as single-line JSON to stdout."""
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={
            "asctime": "timestamp",
            "levelname": "level",
            "name": "logger",
        },
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    root.addHandler(stream_handler)

    recent_handler = RecentEventHandler()
    recent_handler.setFormatter(formatter)
    root.addHandler(recent_handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(logger_name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True

    logging.getLogger("uvicorn.access").disabled = True


def log_event(
    logger: logging.Logger,
    event_type: str,
    *,
    level: int = logging.INFO,
    message: Optional[str] = None,
    **fields: Any,
) -> None:
    """Emit a structured log event using logging.extra fields."""
    extra = {"event_type": event_type}
    for key, value in fields.items():
        safe_key = f"field_{key}" if key in _RESERVED_ATTRS else key
        extra[safe_key] = value
    logger.log(level, message or event_type, extra=extra)


def get_recent_events(
    *,
    student_id_hash: Optional[str] = None,
    limit: int = 100,
) -> list[Dict[str, Any]]:
    """Return recent structured events, optionally filtered by student hash."""
    events = list(_RECENT_EVENTS)
    if student_id_hash:
        events = [event for event in events if event.get("student_id_hash") == student_id_hash]
    return events[-limit:]
