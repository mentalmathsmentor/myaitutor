from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Identity, Index, Integer
from sqlalchemy import String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarative model for the MAIT Postgres schema."""


class StudentContextRecord(Base):
    __tablename__ = "student_contexts"

    student_id: Mapped[str] = mapped_column(String, primary_key=True)
    context_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    updated_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"StudentContextRecord(student_id={self.student_id!r})"


class WaitlistEmail(Base):
    __tablename__ = "waitlist_emails"

    email: Mapped[str] = mapped_column(String, primary_key=True)
    timestamp: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"WaitlistEmail(email={self.email!r})"


class VisitCounter(Base):
    __tablename__ = "visit_counter"
    __table_args__ = (CheckConstraint("id = 1", name="visit_counter_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    def __repr__(self) -> str:
        return f"VisitCounter(id={self.id!r}, count={self.count!r})"


class ConversationHistory(Base):
    __tablename__ = "conversation_history"
    __table_args__ = (
        Index("idx_conv_student", "student_id"),
        Index("idx_conv_timestamp", "student_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(start=1), primary_key=True)
    student_id: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fatigue_state: Mapped[str | None] = mapped_column(String, nullable=True)
    blooms_level: Mapped[str | None] = mapped_column(String, nullable=True)
    topic: Mapped[str | None] = mapped_column(String, nullable=True)

    def __repr__(self) -> str:
        return f"ConversationHistory(id={self.id!r}, student_id={self.student_id!r}, role={self.role!r})"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("idx_users_student_id", "student_id"),)

    google_id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    picture: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_login: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    def __repr__(self) -> str:
        return f"User(google_id={self.google_id!r}, student_id={self.student_id!r})"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (Index("idx_documents_student_id", "student_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    student_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False, default="artifact", server_default=text("'artifact'"))
    source: Mapped[str] = mapped_column(String, nullable=False, default="manual", server_default=text("'manual'"))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    elements: Mapped[list["DocumentElement"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentElement.sort_key",
    )
    revisions: Mapped[list["DocumentRevision"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentRevision.created_at",
    )
    builds: Mapped[list["ArtifactBuild"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="ArtifactBuild.created_at",
    )

    def __repr__(self) -> str:
        return f"Document(public_id={self.public_id!r}, student_id={self.student_id!r}, title={self.title!r})"


class DocumentElement(Base):
    __tablename__ = "document_elements"
    __table_args__ = (Index("idx_elements_document_id", "document_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_key: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    content_latex: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    version_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    is_collapsed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    document: Mapped[Document] = relationship(back_populates="elements")
    revisions: Mapped[list["DocumentRevision"]] = relationship(back_populates="element")

    def __repr__(self) -> str:
        return f"DocumentElement(public_id={self.public_id!r}, document_id={self.document_id!r}, kind={self.kind!r})"


class DocumentRevision(Base):
    __tablename__ = "document_revisions"
    __table_args__ = (Index("idx_revisions_document_id", "document_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    element_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_elements.id", ondelete="SET NULL"),
        nullable=True,
    )
    instruction_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False, default="manual", server_default=text("'manual'"))
    input_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending", server_default=text("'pending'"))
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    document: Mapped[Document] = relationship(back_populates="revisions")
    element: Mapped[DocumentElement | None] = relationship(back_populates="revisions")

    def __repr__(self) -> str:
        return f"DocumentRevision(public_id={self.public_id!r}, status={self.status!r})"


class ArtifactBuild(Base):
    __tablename__ = "artifact_builds"
    __table_args__ = (Index("idx_builds_document_id", "document_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="queued", server_default=text("'queued'"))
    pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message_human: Mapped[str | None] = mapped_column(Text, nullable=True)
    build_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[Any] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at: Mapped[Any | None] = mapped_column(DateTime(timezone=True), nullable=True)

    document: Mapped[Document] = relationship(back_populates="builds")

    def __repr__(self) -> str:
        return f"ArtifactBuild(public_id={self.public_id!r}, status={self.status!r})"
