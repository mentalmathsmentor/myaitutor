"""
Per-element AI revision service for the MAIT Native Canvas.

Uses Gemini Flash to revise individual LaTeX fragments based on teacher instructions.
Stores revision history in the document_revisions table.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..db.models import Document, DocumentElement, DocumentRevision
from ..db.serializers import generate_public_id, serialize_revision, utc_now
from .gemini_client import MODEL_ID, get_client

FRAGMENT_REVISION_SYSTEM_PROMPT = r"""You are a LaTeX worksheet editor for NSW HSC Mathematics.
You will receive ONE fragment of a LaTeX worksheet and an editing instruction.

RULES:
1. Output ONLY the revised LaTeX fragment. No commentary, no markdown fences.
2. Preserve the exact LaTeX style, packages, and formatting conventions of the input.
3. Do NOT add \documentclass, \begin{document}, or \end{document} — you are editing a fragment.
4. ALL math must use proper LaTeX: \frac{}{}, \int_{}, \lim_{}, etc.
5. If the instruction asks to add content, add it seamlessly within the fragment.
6. If the instruction is ambiguous, err on the side of minimal change."""


def _build_revision_prompt(kind: str, label: str, content_latex: str, instruction: str) -> str:
    return f"""FRAGMENT KIND: {kind}
FRAGMENT LABEL: {label}

CURRENT CONTENT:
{content_latex}

INSTRUCTION: {instruction}

Output the revised fragment only."""


async def _get_element_with_document(session: AsyncSession, element_id: str) -> DocumentElement | None:
    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .where(DocumentElement.public_id == element_id)
    )
    return result.scalar_one_or_none()


async def _get_element_with_document_for_student(
    session: AsyncSession,
    element_id: str,
    student_id: str,
) -> DocumentElement | None:
    result = await session.execute(
        select(DocumentElement)
        .options(joinedload(DocumentElement.document))
        .join(Document)
        .where(
            DocumentElement.public_id == element_id,
            Document.student_id == student_id,
        )
    )
    return result.scalar_one_or_none()


async def create_revision(session: AsyncSession, element_id: str, instruction: str) -> dict:
    from google.genai import types

    element = await _get_element_with_document(session, element_id)
    if element is None:
        raise ValueError(f"Element {element_id} not found")

    document = element.document
    input_snapshot = element.content_latex or ""
    user_prompt = _build_revision_prompt(element.kind, element.label or "Element", input_snapshot, instruction)
    config = types.GenerateContentConfig(
        system_instruction=FRAGMENT_REVISION_SYSTEM_PROMPT,
        max_output_tokens=1500,
        temperature=0.3,
    )

    client = get_client()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_ID,
                contents=user_prompt,
                config=config,
            ),
            timeout=30.0,
        )
        output_snapshot = response.text.strip()
    except Exception as exc:
        revision = DocumentRevision(
            public_id=generate_public_id("rev"),
            document=document,
            element=element,
            instruction_text=instruction,
            provider="gemini",
            input_snapshot=input_snapshot,
            output_snapshot="",
            status="failed",
            created_at=utc_now(),
        )
        session.add(revision)
        await session.commit()
        await session.refresh(revision)
        revision.document = document
        revision.element = element
        raise RuntimeError(f"Gemini revision failed: {exc}")

    revision = DocumentRevision(
        public_id=generate_public_id("rev"),
        document=document,
        element=element,
        instruction_text=instruction,
        provider="gemini",
        input_snapshot=input_snapshot,
        output_snapshot=output_snapshot,
        status="pending",
        created_at=utc_now(),
    )
    session.add(revision)
    await session.commit()
    await session.refresh(revision)
    revision.document = document
    revision.element = element
    return serialize_revision(revision)


async def create_revision_for_student(
    session: AsyncSession,
    element_id: str,
    student_id: str,
    instruction: str,
) -> dict:
    from google.genai import types

    element = await _get_element_with_document_for_student(session, element_id, student_id)
    if element is None:
        raise ValueError(f"Element {element_id} not found")

    document = element.document
    input_snapshot = element.content_latex or ""
    user_prompt = _build_revision_prompt(element.kind, element.label or "Element", input_snapshot, instruction)
    config = types.GenerateContentConfig(
        system_instruction=FRAGMENT_REVISION_SYSTEM_PROMPT,
        max_output_tokens=1500,
        temperature=0.3,
    )

    client = get_client()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_ID,
                contents=user_prompt,
                config=config,
            ),
            timeout=30.0,
        )
        output_snapshot = response.text.strip()
    except Exception as exc:
        revision = DocumentRevision(
            public_id=generate_public_id("rev"),
            document=document,
            element=element,
            instruction_text=instruction,
            provider="gemini",
            input_snapshot=input_snapshot,
            output_snapshot="",
            status="failed",
            created_at=utc_now(),
        )
        session.add(revision)
        await session.commit()
        await session.refresh(revision)
        revision.document = document
        revision.element = element
        raise RuntimeError(f"Gemini revision failed: {exc}")

    revision = DocumentRevision(
        public_id=generate_public_id("rev"),
        document=document,
        element=element,
        instruction_text=instruction,
        provider="gemini",
        input_snapshot=input_snapshot,
        output_snapshot=output_snapshot,
        status="pending",
        created_at=utc_now(),
    )
    session.add(revision)
    await session.commit()
    await session.refresh(revision)
    revision.document = document
    revision.element = element
    return serialize_revision(revision)


async def apply_revision(session: AsyncSession, revision_id: str) -> dict:
    result = await session.execute(
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .where(DocumentRevision.public_id == revision_id)
    )
    revision = result.scalar_one_or_none()
    if revision is None:
        raise ValueError(f"Revision {revision_id} not found")
    if revision.status != "pending":
        raise ValueError(f"Revision {revision_id} is not pending (status={revision.status})")

    if revision.element is not None:
        revision.element.content_latex = revision.output_snapshot
        revision.element.updated_at = utc_now()
    revision.status = "applied"
    await session.commit()
    await session.refresh(revision)
    return serialize_revision(revision)


async def apply_revision_for_student(
    session: AsyncSession,
    revision_id: str,
    student_id: str,
) -> dict:
    result = await session.execute(
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .join(Document)
        .where(
            DocumentRevision.public_id == revision_id,
            Document.student_id == student_id,
        )
    )
    revision = result.scalar_one_or_none()
    if revision is None:
        raise ValueError(f"Revision {revision_id} not found")
    if revision.status != "pending":
        raise ValueError(f"Revision {revision_id} is not pending (status={revision.status})")

    if revision.element is not None:
        revision.element.content_latex = revision.output_snapshot
        revision.element.updated_at = utc_now()
    revision.status = "applied"
    await session.commit()
    await session.refresh(revision)
    return serialize_revision(revision)


async def reject_revision(session: AsyncSession, revision_id: str) -> dict:
    result = await session.execute(
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .where(DocumentRevision.public_id == revision_id)
    )
    revision = result.scalar_one_or_none()
    if revision is None:
        raise ValueError(f"Revision {revision_id} not found")

    revision.status = "rejected"
    await session.commit()
    await session.refresh(revision)
    return serialize_revision(revision)


async def reject_revision_for_student(
    session: AsyncSession,
    revision_id: str,
    student_id: str,
) -> dict:
    result = await session.execute(
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .join(Document)
        .where(
            DocumentRevision.public_id == revision_id,
            Document.student_id == student_id,
        )
    )
    revision = result.scalar_one_or_none()
    if revision is None:
        raise ValueError(f"Revision {revision_id} not found")

    revision.status = "rejected"
    await session.commit()
    await session.refresh(revision)
    return serialize_revision(revision)


async def list_revisions(
    session: AsyncSession,
    document_id: str,
    element_id: Optional[str] = None,
) -> list[dict]:
    document_result = await session.execute(select(Document).where(Document.public_id == document_id))
    document = document_result.scalar_one_or_none()
    if document is None:
        return []

    query = (
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .where(DocumentRevision.document_id == document.id)
        .order_by(DocumentRevision.created_at.desc())
    )

    if element_id:
        element_result = await session.execute(
            select(DocumentElement).where(
                DocumentElement.public_id == element_id,
                DocumentElement.document_id == document.id,
            )
        )
        element = element_result.scalar_one_or_none()
        if element is None:
            return []
        query = query.where(DocumentRevision.element_id == element.id)

    result = await session.execute(query)
    return [serialize_revision(revision) for revision in result.scalars().all()]


async def list_revisions_for_student(
    session: AsyncSession,
    document_id: str,
    student_id: str,
    element_id: Optional[str] = None,
) -> list[dict]:
    document_result = await session.execute(
        select(Document).where(
            Document.public_id == document_id,
            Document.student_id == student_id,
        )
    )
    document = document_result.scalar_one_or_none()
    if document is None:
        return []

    query = (
        select(DocumentRevision)
        .options(
            joinedload(DocumentRevision.document),
            joinedload(DocumentRevision.element),
        )
        .where(DocumentRevision.document_id == document.id)
        .order_by(DocumentRevision.created_at.desc())
    )

    if element_id:
        element_result = await session.execute(
            select(DocumentElement).where(
                DocumentElement.public_id == element_id,
                DocumentElement.document_id == document.id,
            )
        )
        element = element_result.scalar_one_or_none()
        if element is None:
            return []
        query = query.where(DocumentRevision.element_id == element.id)

    result = await session.execute(query)
    return [serialize_revision(revision) for revision in result.scalars().all()]
