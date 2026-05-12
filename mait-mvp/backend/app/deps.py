import logging

from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from .models import StudentContext
from .services import storage
from .logging_config import hash_identifier, log_event, request_context

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


async def verify_student_auth(request: Request, student_id: str):
    """Verify Student-ID header for sensitive data."""
    header_id = request.headers.get("X-Student-Id")
    if header_id and header_id != student_id:
        log_event(
            logger,
            "auth_event",
            level=logging.WARNING,
            action="x_student_id_mismatch",
            success=False,
            supplied_student_id_hash=hash_identifier(student_id),
            header_student_id_hash=hash_identifier(header_id),
            source="x_student_id_header",
            **request_context(request),
        )
        raise HTTPException(status_code=403, detail="Unauthorized: Student ID mismatch")
    if header_id:
        log_event(
            logger,
            "auth_event",
            action="x_student_id_verified",
            success=True,
            supplied_student_id_hash=hash_identifier(student_id),
            source="x_student_id_header",
            **request_context(request),
        )
    else:
        log_event(
            logger,
            "auth_event",
            level=logging.WARNING,
            action="x_student_id_missing",
            success=False,
            supplied_student_id_hash=hash_identifier(student_id),
            source="x_student_id_header",
            **request_context(request),
        )


async def get_or_create_context(student_id: str) -> StudentContext:
    context = await storage.get_context(student_id)
    if context is None:
        context = StudentContext(student_id=student_id)
        await storage.save_context(student_id, context)
    return context
