from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..db.models import Document, DocumentElement
from ..db.serializers import generate_public_id, serialize_element, utc_now


async def create_element(
    session: AsyncSession,
    document_id: str,
    sort_key: str,
    kind: str,
    label: str = "Element",
    content_latex: str = "",
    version_id: str = "v1",
    is_locked: bool = False,
    is_collapsed: bool = False,
) -> dict:
    document_result = await session.execute(
        select(Document).where(Document.public_id == document_id)
    )
    document = document_result.scalar_one_or_none()
    if document is None:
        raise ValueError(f"Document {document_id} not found")

    element = DocumentElement(
        public_id=generate_public_id("elem"),
        document=document,
        sort_key=sort_key,
        kind=kind,
        label=label,
        content_latex=content_latex,
        version_id=version_id,
        is_locked=is_locked,
        is_collapsed=is_collapsed,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    session.add(element)
    await session.commit()
    await session.refresh(element)
    element.document = document
    return serialize_element(element)


async def create_element_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
    sort_key: str,
    kind: str,
    label: str = "Element",
    content_latex: str = "",
    version_id: str = "v1",
    is_locked: bool = False,
    is_collapsed: bool = False,
) -> dict:
    document_result = await session.execute(
        select(Document).where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
    )
    document = document_result.scalar_one_or_none()
    if document is None:
        raise ValueError(f"Document {document_id} not found")

    element = DocumentElement(
        public_id=generate_public_id("elem"),
        document=document,
        sort_key=sort_key,
        kind=kind,
        label=label,
        content_latex=content_latex,
        version_id=version_id,
        is_locked=is_locked,
        is_collapsed=is_collapsed,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    session.add(element)
    await session.commit()
    await session.refresh(element)
    element.document = document
    return serialize_element(element)


async def get_elements(session: AsyncSession, document_id: str) -> list[dict]:
    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .join(Document)
        .where(Document.public_id == document_id)
        .order_by(DocumentElement.sort_key.asc())
    )
    return [serialize_element(row) for row in result.scalars().all()]


async def get_elements_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
) -> list[dict]:
    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .join(Document)
        .where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
        .order_by(DocumentElement.sort_key.asc())
    )
    return [serialize_element(row) for row in result.scalars().all()]


async def update_element(session: AsyncSession, element_id: str, updates: dict[str, Any]) -> dict | None:
    if not updates:
        return None

    field_maps = {
        "contentLatex": "content_latex",
        "sortKey": "sort_key",
        "isLocked": "is_locked",
        "isCollapsed": "is_collapsed",
        "label": "label",
        "versionId": "version_id",
    }
    allowed_columns = {
        "content_latex",
        "sort_key",
        "is_locked",
        "is_collapsed",
        "label",
        "version_id",
    }

    db_updates: dict[str, Any] = {}
    for key, value in updates.items():
        db_key = field_maps.get(key, key)
        if db_key in allowed_columns:
            db_updates[db_key] = value

    if not db_updates:
        return None

    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .where(DocumentElement.public_id == element_id)
    )
    element = result.scalar_one_or_none()
    if element is None:
        return None

    for key, value in db_updates.items():
        setattr(element, key, value)
    element.updated_at = utc_now()
    await session.commit()
    await session.refresh(element)
    return serialize_element(element)


async def update_element_for_student(
    session: AsyncSession,
    element_id: str,
    student_id: str,
    updates: dict[str, Any],
) -> dict | None:
    if not updates:
        return None

    field_maps = {
        "contentLatex": "content_latex",
        "sortKey": "sort_key",
        "isLocked": "is_locked",
        "isCollapsed": "is_collapsed",
        "label": "label",
        "versionId": "version_id",
    }
    allowed_columns = {
        "content_latex",
        "sort_key",
        "is_locked",
        "is_collapsed",
        "label",
        "version_id",
    }

    db_updates: dict[str, Any] = {}
    for key, value in updates.items():
        db_key = field_maps.get(key, key)
        if db_key in allowed_columns:
            db_updates[db_key] = value

    if not db_updates:
        return None

    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .join(Document)
        .where(
            DocumentElement.public_id == element_id,
            Document.student_id == student_id,
        )
    )
    element = result.scalar_one_or_none()
    if element is None:
        return None

    for key, value in db_updates.items():
        setattr(element, key, value)
    element.updated_at = utc_now()
    await session.commit()
    await session.refresh(element)
    return serialize_element(element)


async def delete_element(session: AsyncSession, element_id: str) -> bool:
    result = await session.execute(select(DocumentElement).where(DocumentElement.public_id == element_id))
    element = result.scalar_one_or_none()
    if element is None:
        return False
    await session.delete(element)
    await session.commit()
    return True


async def delete_element_for_student(
    session: AsyncSession,
    element_id: str,
    student_id: str,
) -> bool:
    result = await session.execute(
        select(DocumentElement)
        .join(Document)
        .where(
            DocumentElement.public_id == element_id,
            Document.student_id == student_id,
        )
    )
    element = result.scalar_one_or_none()
    if element is None:
        return False
    await session.delete(element)
    await session.commit()
    return True
