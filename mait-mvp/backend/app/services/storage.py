"""Postgres-backed storage service built on SQLAlchemy async ORM."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.serializers import serialize_history, serialize_user, serialize_waitlist_email, utc_now
from ..db.models import ConversationHistory, StudentContextRecord, User, VisitCounter, WaitlistEmail
from ..models import StudentContext


async def init_db() -> None:
    """Verify database connectivity on startup."""
    from ..db.session import engine

    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))


async def get_context(session: AsyncSession, student_id: str) -> Optional[StudentContext]:
    result = await session.execute(
        select(StudentContextRecord).where(StudentContextRecord.student_id == student_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return StudentContext.model_validate(row.context_json)


async def save_context(session: AsyncSession, student_id: str, context: StudentContext) -> None:
    payload = context.model_dump(mode="json")
    stmt = pg_insert(StudentContextRecord).values(
        student_id=student_id,
        context_json=payload,
        updated_at=utc_now(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[StudentContextRecord.student_id],
        set_={
            "context_json": stmt.excluded.context_json,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    await session.execute(stmt)
    await session.commit()


async def save_email(session: AsyncSession, email: str) -> None:
    stmt = pg_insert(WaitlistEmail).values(email=email, timestamp=utc_now())
    stmt = stmt.on_conflict_do_nothing(index_elements=[WaitlistEmail.email])
    await session.execute(stmt)
    await session.commit()


async def increment_visit_count(session: AsyncSession) -> int:
    await session.execute(
        pg_insert(VisitCounter).values(id=1, count=0).on_conflict_do_nothing(index_elements=[VisitCounter.id])
    )
    await session.execute(
        update(VisitCounter).where(VisitCounter.id == 1).values(count=VisitCounter.count + 1)
    )
    await session.commit()
    result = await session.execute(select(VisitCounter.count).where(VisitCounter.id == 1))
    count = result.scalar_one_or_none()
    return count or 0


async def get_visit_count(session: AsyncSession) -> int:
    result = await session.execute(select(VisitCounter.count).where(VisitCounter.id == 1))
    count = result.scalar_one_or_none()
    return count or 0


async def save_message(
    session: AsyncSession,
    student_id: str,
    role: str,
    content: str,
    fatigue_state: str = None,
    blooms_level: str = None,
    topic: str = None,
) -> None:
    message = ConversationHistory(
        student_id=student_id,
        role=role,
        content=content,
        fatigue_state=fatigue_state,
        blooms_level=blooms_level,
        topic=topic,
    )
    session.add(message)
    await session.commit()


async def get_history(session: AsyncSession, student_id: str, limit: int = 20) -> list[dict]:
    result = await session.execute(
        select(ConversationHistory)
        .where(ConversationHistory.student_id == student_id)
        .order_by(ConversationHistory.id.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [serialize_history(row) for row in reversed(rows)]


async def clear_history(session: AsyncSession, student_id: str) -> None:
    await session.execute(
        delete(ConversationHistory).where(ConversationHistory.student_id == student_id)
    )
    await session.commit()


async def get_history_token_estimate(session: AsyncSession, student_id: str) -> int:
    result = await session.execute(
        select(func.sum(func.length(ConversationHistory.content))).where(
            ConversationHistory.student_id == student_id
        )
    )
    total_chars = result.scalar_one_or_none() or 0
    return total_chars // 4


async def upsert_user(
    session: AsyncSession,
    google_id: str,
    student_id: str,
    email: str = "",
    name: str = "",
    picture: str = "",
) -> dict:
    stmt = pg_insert(User).values(
        google_id=google_id,
        student_id=student_id,
        email=email,
        name=name,
        picture=picture,
        last_login=utc_now(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[User.google_id],
        set_={
            "email": stmt.excluded.email,
            "name": stmt.excluded.name,
            "picture": stmt.excluded.picture,
            "last_login": stmt.excluded.last_login,
        },
    )
    await session.execute(stmt)
    await session.commit()
    return await get_user_by_google_id(session, google_id)


async def get_user_by_google_id(session: AsyncSession, google_id: str) -> Optional[dict]:
    result = await session.execute(select(User).where(User.google_id == google_id))
    row = result.scalar_one_or_none()
    return serialize_user(row) if row is not None else None


async def get_user_by_student_id(session: AsyncSession, student_id: str) -> Optional[dict]:
    result = await session.execute(select(User).where(User.student_id == student_id))
    row = result.scalar_one_or_none()
    return serialize_user(row) if row is not None else None


async def get_all_emails(session: AsyncSession) -> list[dict]:
    result = await session.execute(select(WaitlistEmail).order_by(WaitlistEmail.timestamp.asc()))
    return [serialize_waitlist_email(row) for row in result.scalars().all()]
