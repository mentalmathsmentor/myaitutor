"""Cerberus verify endpoint — inline suggestions beside each question.

The request schema deliberately mirrors the isolation contract: the client
sends the four contract fields per item (plus an optional question_log_id /
session_id for instrumentation bookkeeping, which never reach the model).
"""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..db.tutor_models import TutorSession
from ..deps import get_current_tutor
from ..services.cerberus import CerberusItem, CerberusSeverity, verify_batch

router = APIRouter(tags=["cerberus"])

MAX_BATCH = 20


class VerifyRequestItem(CerberusItem):
    """Contract fields + an opaque client correlation id (not sent to model)."""

    model_config = CerberusItem.model_config.copy()
    model_config["extra"] = "forbid"

    question_log_id: Optional[str] = None


class VerifyRequest(BaseModel):
    session_id: Optional[UUID] = None
    items: List[VerifyRequestItem] = Field(..., min_length=1, max_length=MAX_BATCH)


@router.post("/api/cerberus/verify")
async def cerberus_verify(
    body: VerifyRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    contract_items = [
        CerberusItem(
            question_text=item.question_text,
            worked_solution=item.worked_solution,
            outcome_or_bloom_tag=item.outcome_or_bloom_tag,
            student_level_tag=item.student_level_tag,
        )
        for item in body.items
    ]
    results = await verify_batch(contract_items)

    catch_count = 0
    payload = []
    for item, result in zip(body.items, results):
        if result is None:
            payload.append(
                {
                    "question_log_id": item.question_log_id,
                    "status": "unavailable",
                    "suggestions": [],
                }
            )
            continue
        catch_count += sum(
            1 for s in result.suggestions if s.severity == CerberusSeverity.FIX
        )
        payload.append(
            {
                "question_log_id": item.question_log_id,
                "status": "verified",
                "suggestions": [s.model_dump() for s in result.suggestions],
            }
        )

    if body.session_id is not None and catch_count:
        session_result = await db.execute(
            select(TutorSession).where(
                TutorSession.id == body.session_id,
                TutorSession.tutor_id == tutor_id,
            )
        )
        session = session_result.scalar_one_or_none()
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        session.cerberus_catch_count += catch_count
        await db.commit()

    return {"results": payload, "catch_count": catch_count}
