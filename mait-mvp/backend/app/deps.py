from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from .models import StudentContext
from .services import storage

limiter = Limiter(key_func=get_remote_address)


async def verify_student_auth(request: Request, student_id: str):
    """Verify Student-ID header for sensitive data."""
    header_id = request.headers.get("X-Student-Id")
    if header_id and header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Student ID mismatch")


async def get_or_create_context(student_id: str, session: AsyncSession) -> StudentContext:
    context = await storage.get_context(session, student_id)
    if context is None:
        context = StudentContext(student_id=student_id)
        await storage.save_context(session, student_id, context)
    return context
