from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import Document
from ..db.serializers import generate_public_id, parse_json_text, serialize_document, utc_now


async def create_document(
    session: AsyncSession,
    student_id: str,
    title: str,
    kind: str = "artifact",
    source: str = "manual",
    metadata_json: str = "{}",
) -> dict:
    document = Document(
        public_id=generate_public_id("doc"),
        student_id=student_id,
        title=title,
        kind=kind,
        source=source,
        metadata_json=parse_json_text(metadata_json),
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return serialize_document(document)


async def get_document(session: AsyncSession, document_id: str) -> dict | None:
    result = await session.execute(select(Document).where(Document.public_id == document_id))
    document = result.scalar_one_or_none()
    return serialize_document(document) if document is not None else None


async def get_document_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
) -> dict | None:
    result = await session.execute(
        select(Document).where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
    )
    document = result.scalar_one_or_none()
    return serialize_document(document) if document is not None else None


async def get_documents_by_student(session: AsyncSession, student_id: str) -> list[dict]:
    result = await session.execute(
        select(Document)
        .where(Document.student_id == student_id)
        .order_by(Document.updated_at.desc())
    )
    return [serialize_document(document) for document in result.scalars().all()]


async def update_document_title(session: AsyncSession, document_id: str, new_title: str) -> bool:
    result = await session.execute(select(Document).where(Document.public_id == document_id))
    document = result.scalar_one_or_none()
    if document is None:
        return False
    document.title = new_title
    document.updated_at = utc_now()
    await session.commit()
    return True


async def update_document_title_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
    new_title: str,
) -> bool:
    result = await session.execute(
        select(Document).where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        return False
    document.title = new_title
    document.updated_at = utc_now()
    await session.commit()
    return True


async def delete_document(session: AsyncSession, document_id: str) -> bool:
    result = await session.execute(select(Document).where(Document.public_id == document_id))
    document = result.scalar_one_or_none()
    if document is None:
        return False
    await session.delete(document)
    await session.commit()
    return True


async def delete_document_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
) -> bool:
    result = await session.execute(
        select(Document).where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
    )
    document = result.scalar_one_or_none()
    if document is None:
        return False
    await session.delete(document)
    await session.commit()
    return True
