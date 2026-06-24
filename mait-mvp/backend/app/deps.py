from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from .models import StudentContext
from .services import storage

limiter = Limiter(key_func=get_remote_address)
LOCAL_DEV_TUTOR_ID = UUID("00000000-0000-0000-0000-000000000000")


async def verify_student_auth(request: Request, student_id: str):
    """Verify Student-ID header for sensitive data."""
    header_id = request.headers.get("X-Student-Id")
    # Temporary strict enforcement until JWT auth.
    if not header_id:
        raise HTTPException(status_code=401, detail="Missing X-Student-Id header")
    if header_id and header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Student ID mismatch")


async def get_current_student_id(request: Request) -> str:
    """Return the asserted student ID from the legacy header."""
    header_id = request.headers.get("X-Student-Id")
    # Temporary strict enforcement until JWT auth.
    if not header_id:
        raise HTTPException(status_code=401, detail="Missing X-Student-Id header")
    return header_id


async def get_current_tutor() -> UUID:
    """Local-dev tutor auth bypass for Tutor Exoskeleton V1."""
    return LOCAL_DEV_TUTOR_ID


async def get_or_create_context(student_id: str, session: AsyncSession) -> StudentContext:
    context = await storage.get_context(session, student_id)
    if context is None:
        context = StudentContext(student_id=student_id)
        await storage.save_context(session, student_id, context)
    return context
