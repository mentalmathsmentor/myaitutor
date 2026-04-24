from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from .models import ConversationHistory, Document, DocumentElement, DocumentRevision, User, WaitlistEmail


def generate_public_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def parse_json_text(raw: str | None) -> dict[str, Any]:
    if raw in (None, ""):
        return {}
    parsed = json.loads(raw)
    if isinstance(parsed, dict):
        return parsed
    raise ValueError("Expected a JSON object payload")


def json_to_text(value: Any) -> str:
    return json.dumps(value or {}, separators=(",", ":"))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def serialize_document(document: Document) -> dict[str, Any]:
    return {
        "id": document.public_id,
        "studentId": document.student_id,
        "title": document.title,
        "kind": document.kind or "artifact",
        "source": document.source or "manual",
        "metadataJson": json_to_text(document.metadata_json),
        "createdAt": isoformat(document.created_at),
        "updatedAt": isoformat(document.updated_at),
    }


def serialize_element(element: DocumentElement) -> dict[str, Any]:
    return {
        "id": element.public_id,
        "documentId": element.document.public_id if element.document is not None else None,
        "sortKey": element.sort_key,
        "kind": element.kind,
        "label": element.label,
        "contentLatex": element.content_latex,
        "versionId": element.version_id,
        "isLocked": bool(element.is_locked),
        "isCollapsed": bool(element.is_collapsed),
        "createdAt": isoformat(element.created_at),
        "updatedAt": isoformat(element.updated_at),
    }


def serialize_revision(revision: DocumentRevision) -> dict[str, Any]:
    return {
        "id": revision.public_id,
        "document_id": revision.document.public_id if revision.document is not None else None,
        "element_id": revision.element.public_id if revision.element is not None else None,
        "instruction_text": revision.instruction_text,
        "provider": revision.provider,
        "input_snapshot": revision.input_snapshot,
        "output_snapshot": revision.output_snapshot,
        "status": revision.status,
        "created_at": isoformat(revision.created_at),
    }


def serialize_history(record: ConversationHistory) -> dict[str, Any]:
    return {
        "role": record.role,
        "content": record.content,
        "timestamp": isoformat(record.timestamp),
        "fatigue_state": record.fatigue_state,
        "blooms_level": record.blooms_level,
        "topic": record.topic,
    }


def serialize_user(user: User) -> dict[str, Any]:
    return {
        "google_id": user.google_id,
        "student_id": user.student_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "created_at": isoformat(user.created_at),
        "last_login": isoformat(user.last_login),
    }


def serialize_waitlist_email(email: WaitlistEmail) -> dict[str, Any]:
    return {
        "email": email.email,
        "timestamp": isoformat(email.timestamp),
    }
