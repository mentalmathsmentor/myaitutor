"""Per-student memory context assembly — canon §7 two-tier, V1 relational.

Deterministic, DB-only assembly (no embeddings, no LLM calls): at ~5 students
the relational read IS the retrieval, which keeps the dogfood question "does
student memory improve question relevance?" measurable and debuggable.

Zone structure and hard caps follow the Vesper MAIT export packet
(staged_exports/myaitutor — seven-zone assembler): each zone is clamped to a
token budget with the repo's len//4 estimate. Syllabus RAG stays ephemeral and
separate (injected via {rag_chunks}, never persisted into memory) so Cerberus
can be structurally denied it.

Canon rules honoured here:
- Negative-RAG correction: `mastered` topics are suppressed from NEW-TEACHING
  but surface in the retrieval pool once overdue — never hard-blocked.
- Retrieval intervals: shaky -> next session; solid -> 14 days;
  mastered -> 42 days (resurfaces as challenge/checking).
- Tier 1 rolling profile lives in tutor_students.profile JSONB
  ("running_summary"); tutor-editable, never recursively summarised.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.tutor_models import (
    MASTERY_STATUSES,
    RETRIEVAL_INTERVAL_DAYS,
    MistakeVault,
    TopicMastery,
    TutorSession,
    TutorStudent,
)

# Hard caps (tokens, len//4 estimate) — Vesper export packet zone budgets.
CAP_STATIC = 600
CAP_COMPETENCY = 500
CAP_ROLLING_SUMMARY = 350
CAP_LAST_SESSION = 350

MAX_VAULT_ENTRIES = 8


def _estimate_tokens(text: str) -> int:
    return max(0, (len(text) + 3) // 4)


def _clamp(text: str, cap: int) -> str:
    if _estimate_tokens(text) <= cap:
        return text
    return text[: cap * 4].rstrip()


def _due_for_retrieval(row: TopicMastery, now: datetime) -> bool:
    if row.status == "shaky":
        return True
    interval_days = RETRIEVAL_INTERVAL_DAYS.get(row.status)
    if interval_days is None or row.last_seen is None:
        return False
    last_seen = row.last_seen
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    return (now - last_seen).days >= interval_days


async def get_or_create_active_session(
    db: AsyncSession, tutor_id: UUID, student: TutorStudent
) -> TutorSession:
    """Find today's non-completed session for the student, or open one.

    The session is THE SPINE (canon §7): generation, Cerberus counts, outcome
    taps, and the post-session check-in all attach to it.
    """
    result = await db.execute(
        select(TutorSession)
        .where(
            TutorSession.tutor_id == tutor_id,
            TutorSession.student_id == student.id,
            TutorSession.status != "completed",
        )
        .order_by(TutorSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if session is not None:
        return session

    session = TutorSession(tutor_id=tutor_id, student_id=student.id, status="active")
    db.add(session)
    await db.flush()
    return session


async def assemble_student_context(db: AsyncSession, student: TutorStudent) -> str:
    """Build the deterministic {student_context} block for the Generator.

    Returns a bracketed block the prompt templates inject verbatim. Every zone
    is individually capped; an empty store degrades to explicit "none
    recorded" lines rather than silence (visible-degradation rule — Vesper
    debt register R-04)."""
    now = datetime.now(timezone.utc)
    profile = student.profile or {}

    # --- Zone: student.static (durable tutor config) ---
    static_lines = [
        f"Student: {student.name} | Year {student.year_level} | {student.subject}",
    ]
    ability_tier = profile.get("ability_tier")
    if ability_tier:
        static_lines.append(f"Ability tier: {ability_tier}")
    focus_topics = profile.get("current_focus_topics") or []
    if focus_topics:
        static_lines.append("Current focus topics: " + ", ".join(str(t) for t in focus_topics))
    pedagogical_style = profile.get("pedagogical_style")
    if pedagogical_style:
        static_lines.append(f"Pedagogical style: {pedagogical_style}")
    static_zone = _clamp("\n".join(static_lines), CAP_STATIC)

    # --- Zone: student.competency (topic_mastery, field-stable state) ---
    mastery_result = await db.execute(
        select(TopicMastery)
        .where(TopicMastery.student_id == student.id)
        .order_by(TopicMastery.topic)
    )
    mastery_rows = list(mastery_result.scalars().all())

    by_status: dict[str, list[str]] = {status: [] for status in MASTERY_STATUSES}
    due_retrievals: list[str] = []
    for row in mastery_rows:
        by_status.setdefault(row.status, []).append(row.topic)
        if _due_for_retrieval(row, now):
            due_retrievals.append(f"{row.topic} ({row.status})")

    competency_lines = []
    if mastery_rows:
        for status in ("shaky", "introduced", "solid"):
            if by_status.get(status):
                competency_lines.append(f"{status.capitalize()}: " + ", ".join(by_status[status]))
        if by_status.get("mastered"):
            competency_lines.append(
                "Mastered (do NOT re-teach as new content; retrieval-pool only): "
                + ", ".join(by_status["mastered"])
            )
        if due_retrievals:
            competency_lines.append(
                "Due for spaced retrieval this session: " + ", ".join(due_retrievals)
            )
    else:
        competency_lines.append("No topic mastery recorded yet.")
    competency_zone = _clamp("\n".join(competency_lines), CAP_COMPETENCY)

    # --- Zone: memory.mistake_vault (active misconceptions) ---
    vault_result = await db.execute(
        select(MistakeVault)
        .where(MistakeVault.student_id == student.id, MistakeVault.status == "active")
        .order_by(MistakeVault.updated_at.desc())
        .limit(MAX_VAULT_ENTRIES)
    )
    vault_rows = list(vault_result.scalars().all())
    if vault_rows:
        vault_lines = [
            f"- {row.topic} -> {row.failure_mode} -> {row.error_class}" for row in vault_rows
        ]
        vault_zone = _clamp(
            "Active misconceptions (pre-empt these explicitly):\n" + "\n".join(vault_lines),
            CAP_COMPETENCY,
        )
    else:
        vault_zone = "No recorded misconceptions yet."

    # --- Zone: memory.rolling_summary (Tier 1 profile, tutor-editable) ---
    running_summary = str(profile.get("running_summary") or "").strip()
    summary_zone = (
        _clamp(running_summary, CAP_ROLLING_SUMMARY)
        if running_summary
        else "No rolling profile summary yet."
    )

    # --- Zone: memory.last_session (episodic delta, most recent completed) ---
    last_result = await db.execute(
        select(TutorSession)
        .where(TutorSession.student_id == student.id, TutorSession.status == "completed")
        .order_by(TutorSession.date.desc(), TutorSession.created_at.desc())
        .limit(1)
    )
    last_session = last_result.scalar_one_or_none()
    if last_session is not None:
        last_lines = [f"Last session ({last_session.date}):"]
        if last_session.topics:
            last_lines.append("Topics: " + ", ".join(str(t) for t in last_session.topics))
        if last_session.dump:
            last_lines.append(f"Tutor notes: {last_session.dump}")
        last_zone = _clamp("\n".join(last_lines), CAP_LAST_SESSION)
    else:
        last_zone = "No completed sessions on record."

    return "\n".join(
        [
            "[STUDENT CONTEXT — per-student memory, tutor-curated]",
            static_zone,
            "",
            "Competency map:",
            competency_zone,
            "",
            vault_zone,
            "",
            "Rolling profile:",
            summary_zone,
            "",
            last_zone,
            "[END STUDENT CONTEXT]",
        ]
    )
