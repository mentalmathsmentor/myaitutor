"""Tutor V1 student + session endpoints (canon §7 spine).

Additive router: class-mode endpoints in chat.py are untouched. The alias-slug
PII rule is enforced twice — Pydantic pattern here, CHECK constraint in the
schema — so no real name can enter the store through any path.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..db.tutor_models import (
    QUESTION_OUTCOMES,
    MistakeVault,
    QuestionLog,
    TopicMastery,
    TutorSession,
    TutorStudent,
)
from ..deps import get_current_tutor
from ..services.deck_export import deck_to_canvas_elements
from ..services.student_memory import get_or_create_active_session

router = APIRouter(tags=["students"])

ALIAS_SLUG_PATTERN = r"^S[0-9]+$"


class InitStudentRequest(BaseModel):
    name: str = Field(..., pattern=ALIAS_SLUG_PATTERN, description="Alias slug only (S1, S2, ...)")
    subject: str = Field(..., min_length=1, max_length=200)
    year_level: int = Field(..., ge=7, le=12)
    profile: dict[str, Any] = Field(default_factory=dict)


class OutcomeRequest(BaseModel):
    outcome: str
    misconception_tag: str | None = Field(default=None, max_length=200)
    kept: bool | None = None


class CheckinRequest(BaseModel):
    """The <=10s post-session check-in (dogfood Phase 3): three fields."""

    context_relevance: int = Field(..., ge=1, le=5)
    cerberus_usefulness: int = Field(..., ge=1, le=5)
    friction_note: str | None = Field(default=None, max_length=2000)
    dump: str | None = Field(default=None, max_length=8000)


def _serialize_student(student: TutorStudent) -> dict[str, Any]:
    return {
        "id": str(student.id),
        "name": student.name,
        "subject": student.subject,
        "year_level": student.year_level,
        "profile": student.profile,
    }


def _serialize_session(session: TutorSession) -> dict[str, Any]:
    return {
        "id": str(session.id),
        "student_id": str(session.student_id),
        "date": session.date.isoformat() if session.date else None,
        "status": session.status,
        "topics": session.topics,
        "questions_generated": session.questions_generated,
        "questions_kept": session.questions_kept,
        "cerberus_catch_count": session.cerberus_catch_count,
        "edits_made": session.edits_made,
    }


@router.post("/api/students/init")
async def init_student(
    body: InitStudentRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    student = TutorStudent(
        tutor_id=tutor_id,
        name=body.name,
        subject=body.subject,
        year_level=body.year_level,
        profile=body.profile,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return {"student": _serialize_student(student)}


@router.get("/api/students")
async def list_students(
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorStudent).where(TutorStudent.tutor_id == tutor_id).order_by(TutorStudent.name)
    )
    return {"students": [_serialize_student(s) for s in result.scalars().all()]}


@router.post("/api/students/{student_id}/session")
async def open_session(
    student_id: UUID,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorStudent).where(
            TutorStudent.id == student_id, TutorStudent.tutor_id == tutor_id
        )
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    session = await get_or_create_active_session(db, tutor_id, student)
    await db.commit()
    return {"session": _serialize_session(session)}


@router.post("/api/questions/{question_id}/outcome")
async def record_outcome(
    question_id: UUID,
    body: OutcomeRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    """One-tap outcome (canon §7): writes question_log; a struggled/bombed tap
    with a misconception tag also files an active Mistake Vault triplet
    (explicit-assertion rule: the tap IS the demonstrated evidence)."""
    if body.outcome not in QUESTION_OUTCOMES:
        raise HTTPException(status_code=422, detail=f"outcome must be one of {QUESTION_OUTCOMES}")

    result = await db.execute(
        select(QuestionLog, TutorSession)
        .join(TutorSession, QuestionLog.session_id == TutorSession.id)
        .where(QuestionLog.id == question_id, TutorSession.tutor_id == tutor_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Question not found")
    log_row, session = row

    log_row.outcome = body.outcome
    if body.misconception_tag is not None:
        log_row.misconception_tag = body.misconception_tag
    if body.kept is not None:
        previously_kept = bool(log_row.kept)
        log_row.kept = body.kept
        if body.kept and not previously_kept:
            session.questions_kept += 1
        elif not body.kept and previously_kept:
            session.questions_kept -= 1

    if body.outcome in ("struggled", "bombed") and body.misconception_tag:
        db.add(
            MistakeVault(
                student_id=log_row.student_id,
                topic=log_row.topic,
                failure_mode=body.misconception_tag,
                error_class=body.outcome,
                evidence_id=log_row.id,
            )
        )

    await _apply_mastery_transition(db, log_row, body.outcome)
    await db.commit()
    return {"status": "ok", "question_id": str(question_id), "outcome": body.outcome}


async def _apply_mastery_transition(db: AsyncSession, log_row: QuestionLog, outcome: str) -> None:
    """Canon §7 mastery state machine: promotion on 2 consecutive successes,
    demotion of one level on a single 'bombed'. 'skipped' is neutral."""
    from sqlalchemy import func as sa_func

    if outcome == "skipped":
        return

    student_result = await db.execute(
        select(TutorStudent).where(TutorStudent.id == log_row.student_id)
    )
    student = student_result.scalar_one()

    mastery_result = await db.execute(
        select(TopicMastery).where(
            TopicMastery.student_id == log_row.student_id,
            TopicMastery.subject == student.subject,
            TopicMastery.topic == log_row.topic,
        )
    )
    mastery = mastery_result.scalar_one_or_none()
    if mastery is None:
        mastery = TopicMastery(
            student_id=log_row.student_id,
            subject=student.subject,
            topic=log_row.topic,
            status="introduced",
        )
        db.add(mastery)

    ladder = ["unseen", "introduced", "shaky", "solid", "mastered"]
    idx = ladder.index(mastery.status) if mastery.status in ladder else 1

    mastery.last_seen = sa_func.now()
    if outcome == "nailed":
        mastery.streak += 1
        mastery.last_succeeded = sa_func.now()
        if mastery.streak >= 2 and idx < len(ladder) - 1:
            mastery.status = ladder[idx + 1]
            mastery.streak = 0
    elif outcome == "bombed":
        mastery.streak = 0
        if idx > 1:
            mastery.status = ladder[idx - 1]
    elif outcome == "struggled":
        mastery.streak = 0
        if mastery.status in ("unseen", "introduced"):
            mastery.status = "shaky"


@router.get("/api/sessions/{session_id}")
async def get_session(
    session_id: UUID,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorSession).where(
            TutorSession.id == session_id, TutorSession.tutor_id == tutor_id
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    payload = _serialize_session(session)
    payload.update(
        {
            "context_relevance": session.context_relevance,
            "cerberus_usefulness": session.cerberus_usefulness,
            "friction_note": session.friction_note,
            "deck": session.deck,
        }
    )
    return {"session": payload}


@router.post("/api/sessions/{session_id}/deck-export")
async def deck_export(
    session_id: UUID,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    """C4 glue: one-way deck -> Canvas handoff. Returns the element list the
    client seeds into the Canvas IDE; logs the export event on the session
    row (inside deck JSONB — no schema change)."""
    result = await db.execute(
        select(TutorSession, TutorStudent)
        .join(TutorStudent, TutorSession.student_id == TutorStudent.id)
        .where(TutorSession.id == session_id, TutorSession.tutor_id == tutor_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Session not found")
    session, student = row

    title = f"{student.name} — {session.date.isoformat() if session.date else 'session'}"
    try:
        elements, question_count = deck_to_canvas_elements(session.deck, title)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    from datetime import datetime, timezone

    deck = dict(session.deck or {})
    deck["exported_to_canvas"] = {
        "at": datetime.now(timezone.utc).isoformat(),
        "question_count": question_count,
    }
    session.deck = deck
    await db.commit()

    return {"title": title, "question_count": question_count, "elements": elements}


@router.post("/api/sessions/{session_id}/checkin")
async def session_checkin(
    session_id: UUID,
    body: CheckinRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorSession).where(
            TutorSession.id == session_id, TutorSession.tutor_id == tutor_id
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session.context_relevance = body.context_relevance
    session.cerberus_usefulness = body.cerberus_usefulness
    session.friction_note = body.friction_note
    if body.dump is not None:
        session.dump = body.dump
    session.status = "completed"
    await db.commit()
    return {"status": "ok", "session": _serialize_session(session)}
