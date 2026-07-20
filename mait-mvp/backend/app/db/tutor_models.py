from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .models import Base

# Canon §7 mastery state machine (constants ruled — see MAIT_ARCHITECTURE_CANON.md).
MASTERY_STATUSES = ("unseen", "introduced", "shaky", "solid", "mastered")
QUESTION_OUTCOMES = ("nailed", "struggled", "bombed", "skipped")
SESSION_STATUSES = ("planned", "active", "completed")

# Retrieval intervals in days (canon §7): shaky -> next session (always due),
# solid -> 2-3 weeks, mastered -> 6 weeks (resurfaces as challenge/checking).
RETRIEVAL_INTERVAL_DAYS = {"solid": 14, "mastered": 42}


class Tutor(Base):
    __tablename__ = "tutors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    google_id: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)

    classes: Mapped[list["TutorClass"]] = relationship(back_populates="tutor", cascade="all, delete-orphan")
    threads: Mapped[list["ChatThread"]] = relationship(back_populates="tutor", cascade="all, delete-orphan")


class TutorClass(Base):
    __tablename__ = "tutor_classes"
    __table_args__ = (
        Index("idx_tutor_classes_tutor_id", "tutor_id"),
        Index("idx_tutor_classes_subject", "subject"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tutors.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    year_level: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    ability_tier: Mapped[str] = mapped_column(String, nullable=False)
    profile_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    tutor: Mapped[Tutor] = relationship(back_populates="classes")
    threads: Mapped[list["ChatThread"]] = relationship(back_populates="class_")


class ChatThread(Base):
    __tablename__ = "chat_threads"
    __table_args__ = (
        Index("idx_chat_threads_tutor_id", "tutor_id"),
        Index("idx_chat_threads_class_id", "class_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tutors.id", ondelete="CASCADE"),
        nullable=False,
    )
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tutor_classes.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tutor: Mapped[Tutor] = relationship(back_populates="threads")
    class_: Mapped[TutorClass | None] = relationship(back_populates="threads")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("idx_messages_thread_id", "thread_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    retrieval_citations: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    thread: Mapped[ChatThread] = relationship(back_populates="messages")


# ---------------------------------------------------------------------------
# Tutor V1 (canon §7) — the 1-1 tutoring spine. `chat_threads` is NOT used for
# the tutor build (ruled); `sessions` is the container everything hangs off.
# The teacher-sprint tables above remain untouched (brownfield: flag-off, never
# delete). PII rule: `tutor_students.name` is an alias slug ONLY (S1, S2, ...),
# enforced by a schema-level CHECK — no surname/school/contact columns exist.
# ---------------------------------------------------------------------------


class TutorStudent(Base):
    __tablename__ = "tutor_students"
    __table_args__ = (
        CheckConstraint("name ~ '^S[0-9]+$'", name="ck_tutor_students_alias_slug"),
        UniqueConstraint("tutor_id", "name", name="uq_tutor_students_tutor_alias"),
        Index("idx_tutor_students_tutor_id", "tutor_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    year_level: Mapped[int] = mapped_column(Integer, nullable=False)
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutor_classes.id", ondelete="SET NULL"), nullable=True
    )
    profile: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    sessions: Mapped[list["TutorSession"]] = relationship(back_populates="student")
    mastery: Mapped[list["TopicMastery"]] = relationship(back_populates="student")


class TutorSession(Base):
    """THE SPINE (canon §7): pre-session brief, generated deck, in-session log,
    and post-session dump all hang off a session. Also carries the dogfood
    instrumentation counters + post-session check-in (handoff brief Phase 3)."""

    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint(f"status IN {SESSION_STATUSES!r}", name="ck_sessions_status"),
        CheckConstraint(
            "context_relevance IS NULL OR (context_relevance BETWEEN 1 AND 5)",
            name="ck_sessions_context_relevance",
        ),
        CheckConstraint(
            "cerberus_usefulness IS NULL OR (cerberus_usefulness BETWEEN 1 AND 5)",
            name="ck_sessions_cerberus_usefulness",
        ),
        Index("idx_sessions_tutor_id", "tutor_id"),
        Index("idx_sessions_student_id", "student_id"),
        Index("idx_sessions_date", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutor_students.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[Any] = mapped_column(Date, nullable=False, server_default=func.current_date())
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'active'"))
    brief: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    deck: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    dump: Mapped[str | None] = mapped_column(Text, nullable=True)
    topics: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    questions_generated: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    questions_kept: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    cerberus_catch_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    edits_made: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    context_relevance: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    cerberus_usefulness: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    friction_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    student: Mapped[TutorStudent] = relationship(back_populates="sessions")
    question_logs: Mapped[list["QuestionLog"]] = relationship(back_populates="session")


class TopicMastery(Base):
    __tablename__ = "topic_mastery"
    __table_args__ = (
        CheckConstraint(f"status IN {MASTERY_STATUSES!r}", name="ck_topic_mastery_status"),
        UniqueConstraint("student_id", "subject", "topic", name="uq_topic_mastery_student_subject_topic"),
        Index("idx_topic_mastery_student_id", "student_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutor_students.id", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'unseen'"))
    streak: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    last_seen: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=True)
    last_succeeded: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    student: Mapped[TutorStudent] = relationship(back_populates="mastery")


class QuestionLog(Base):
    """One row per generated question (canon §7). Rows are created at
    generation time with outcome NULL; the one-tap outcome buttons fill
    `outcome` mid-session. `kept` records worksheet survival for the dogfood
    generated-vs-kept ratio."""

    __tablename__ = "question_log"
    __table_args__ = (
        CheckConstraint(
            f"outcome IS NULL OR outcome IN {QUESTION_OUTCOMES!r}", name="ck_question_log_outcome"
        ),
        Index("idx_question_log_session_id", "session_id"),
        Index("idx_question_log_student_id", "student_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutor_students.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str] = mapped_column(String, nullable=False)
    question_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)
    misconception_tag: Mapped[str | None] = mapped_column(String, nullable=True)
    kept: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    session: Mapped[TutorSession] = relationship(back_populates="question_logs")


class MistakeVault(Base):
    """Structured error triplets (canon §7): topic -> failure_mode ->
    error_class, with evidence. Never deleted — superseded (Vesper ledger
    discipline); the tutor-editable ledger UI is the QA mechanism."""

    __tablename__ = "mistake_vault"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'superseded')", name="ck_mistake_vault_status"),
        Index("idx_mistake_vault_student_id", "student_id"),
        Index("idx_mistake_vault_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tutor_students.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str] = mapped_column(String, nullable=False)
    failure_mode: Mapped[str] = mapped_column(String, nullable=False)
    error_class: Mapped[str] = mapped_column(String, nullable=False)
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("question_log.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'active'"))
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
