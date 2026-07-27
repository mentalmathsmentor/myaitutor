"""
Tests for the database serializers: public id generation, JSON helpers,
timezone normalisation and the ORM-to-API row mappings.
"""
import json
from datetime import datetime, timedelta, timezone

import pytest
from types import SimpleNamespace

from app.db.serializers import (
    generate_public_id,
    isoformat,
    json_to_text,
    parse_json_text,
    serialize_document,
    serialize_element,
    serialize_history,
    serialize_revision,
    serialize_user,
    serialize_waitlist_email,
    utc_now,
)


# ===========================================================================
# Identifier and JSON helpers
# ===========================================================================

class TestGeneratePublicId:
    """Public ids are prefixed, short and unique."""

    def test_uses_the_given_prefix(self):
        """The prefix is preserved and separated by an underscore."""
        assert generate_public_id("doc").startswith("doc_")

    def test_suffix_is_twelve_hex_chars(self):
        """The random suffix is a 12-character hex string."""
        suffix = generate_public_id("elem").split("_", 1)[1]
        assert len(suffix) == 12
        int(suffix, 16)

    def test_ids_are_unique(self):
        """Consecutive ids do not collide."""
        assert len({generate_public_id("doc") for _ in range(100)}) == 100


class TestParseJsonText:
    """parse_json_text accepts stored JSON text and returns a dict."""

    def test_parses_object(self):
        """A JSON object becomes a dict."""
        assert parse_json_text('{"a": 1}') == {"a": 1}

    def test_none_becomes_empty_dict(self):
        """A NULL column becomes an empty dict."""
        assert parse_json_text(None) == {}

    def test_empty_string_becomes_empty_dict(self):
        """An empty string becomes an empty dict."""
        assert parse_json_text("") == {}

    def test_non_object_payload_raises(self):
        """A JSON array is rejected: metadata must be an object."""
        with pytest.raises(ValueError, match="JSON object payload"):
            parse_json_text("[1, 2]")

    def test_invalid_json_raises(self):
        """Malformed JSON propagates a JSONDecodeError."""
        with pytest.raises(json.JSONDecodeError):
            parse_json_text("{oops")


class TestJsonToText:
    """json_to_text renders compact JSON for storage."""

    def test_uses_compact_separators(self):
        """No spaces are emitted between keys and values."""
        assert json_to_text({"a": 1, "b": 2}) == '{"a":1,"b":2}'

    def test_none_becomes_empty_object(self):
        """None is normalised to an empty JSON object."""
        assert json_to_text(None) == "{}"

    def test_empty_dict_becomes_empty_object(self):
        """An empty dict round-trips as '{}'."""
        assert json_to_text({}) == "{}"


class TestUtcNow:
    """utc_now returns a timezone-aware UTC timestamp."""

    def test_is_timezone_aware_utc(self):
        """The returned datetime carries the UTC offset."""
        now = utc_now()
        assert now.tzinfo is not None
        assert now.utcoffset() == timedelta(0)


class TestIsoformat:
    """isoformat normalises naive datetimes to UTC."""

    def test_none_passes_through(self):
        """A missing timestamp stays None."""
        assert isoformat(None) is None

    def test_naive_datetime_is_assumed_utc(self):
        """A naive datetime is stamped as UTC."""
        assert isoformat(datetime(2026, 3, 1, 9, 30)) == "2026-03-01T09:30:00+00:00"

    def test_aware_datetime_keeps_its_offset(self):
        """An aware datetime keeps its original offset."""
        value = datetime(2026, 3, 1, 9, 30, tzinfo=timezone(timedelta(hours=11)))
        assert isoformat(value) == "2026-03-01T09:30:00+11:00"


# ===========================================================================
# Row serializers
# ===========================================================================

_CREATED = datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)
_UPDATED = datetime(2026, 3, 2, 0, 0, tzinfo=timezone.utc)


class TestSerializeDocument:
    """Documents are serialised with camelCase API keys."""

    def test_maps_all_fields(self):
        """Every column is mapped onto its API key."""
        document = SimpleNamespace(
            public_id="doc_1", student_id="alice", title="Calculus",
            kind="worksheet", source="ai", metadata_json={"pages": 2},
            created_at=_CREATED, updated_at=_UPDATED,
        )
        assert serialize_document(document) == {
            "id": "doc_1",
            "studentId": "alice",
            "title": "Calculus",
            "kind": "worksheet",
            "source": "ai",
            "metadataJson": '{"pages":2}',
            "createdAt": "2026-03-01T00:00:00+00:00",
            "updatedAt": "2026-03-02T00:00:00+00:00",
        }

    def test_kind_and_source_have_defaults(self):
        """Empty kind/source fall back to 'artifact' and 'manual'."""
        document = SimpleNamespace(
            public_id="doc_1", student_id="alice", title="t", kind=None, source=None,
            metadata_json=None, created_at=None, updated_at=None,
        )
        serialized = serialize_document(document)
        assert serialized["kind"] == "artifact"
        assert serialized["source"] == "manual"
        assert serialized["metadataJson"] == "{}"
        assert serialized["createdAt"] is None


class TestSerializeElement:
    """Elements expose their parent document's public id."""

    def _element(self, document=None):
        return SimpleNamespace(
            public_id="elem_1", document=document, sort_key="a2_b_000", kind="question",
            label="Question 1", content_latex="\\item A", version_id="v1",
            is_locked=0, is_collapsed=1, created_at=_CREATED, updated_at=_UPDATED,
        )

    def test_maps_all_fields(self):
        """Element columns are mapped onto camelCase API keys."""
        element = self._element(document=SimpleNamespace(public_id="doc_1"))
        assert serialize_element(element) == {
            "id": "elem_1",
            "documentId": "doc_1",
            "sortKey": "a2_b_000",
            "kind": "question",
            "label": "Question 1",
            "contentLatex": "\\item A",
            "versionId": "v1",
            "isLocked": False,
            "isCollapsed": True,
            "createdAt": "2026-03-01T00:00:00+00:00",
            "updatedAt": "2026-03-02T00:00:00+00:00",
        }

    def test_detached_element_has_no_document_id(self):
        """An element without a loaded document serialises documentId as None."""
        assert serialize_element(self._element())["documentId"] is None

    def test_integer_flags_are_coerced_to_bool(self):
        """SQLite-style 0/1 flags become real booleans."""
        serialized = serialize_element(self._element())
        assert serialized["isLocked"] is False
        assert serialized["isCollapsed"] is True


class TestSerializeRevision:
    """Revisions keep snake_case keys and optional relations."""

    def test_maps_all_fields(self):
        """Document and element relations are flattened to public ids."""
        revision = SimpleNamespace(
            public_id="rev_1",
            document=SimpleNamespace(public_id="doc_1"),
            element=SimpleNamespace(public_id="elem_1"),
            instruction_text="Make it harder",
            provider="gemini",
            input_snapshot="before",
            output_snapshot="after",
            status="complete",
            created_at=_CREATED,
        )
        assert serialize_revision(revision) == {
            "id": "rev_1",
            "document_id": "doc_1",
            "element_id": "elem_1",
            "instruction_text": "Make it harder",
            "provider": "gemini",
            "input_snapshot": "before",
            "output_snapshot": "after",
            "status": "complete",
            "created_at": "2026-03-01T00:00:00+00:00",
        }

    def test_missing_relations_serialise_as_none(self):
        """A revision with no element still serialises."""
        revision = SimpleNamespace(
            public_id="rev_1", document=None, element=None, instruction_text=None,
            provider="manual", input_snapshot=None, output_snapshot=None,
            status="pending", created_at=None,
        )
        serialized = serialize_revision(revision)
        assert serialized["document_id"] is None
        assert serialized["element_id"] is None


class TestSerializeHistory:
    """Conversation history rows carry pedagogical metadata."""

    def test_maps_all_fields(self):
        """Role, content and tutoring metadata are all included."""
        record = SimpleNamespace(
            role="user", content="What is a derivative?", timestamp=_CREATED,
            fatigue_state="FRESH", blooms_level="UNDERSTAND", topic="Calculus",
        )
        assert serialize_history(record) == {
            "role": "user",
            "content": "What is a derivative?",
            "timestamp": "2026-03-01T00:00:00+00:00",
            "fatigue_state": "FRESH",
            "blooms_level": "UNDERSTAND",
            "topic": "Calculus",
        }


class TestSerializeUser:
    """User rows expose profile fields and login timestamps."""

    def test_maps_all_fields(self):
        """Google profile fields and timestamps are serialised."""
        user = SimpleNamespace(
            google_id="g1", student_id="alice", email="a@example.com",
            name="Alice", picture="https://example.com/a.png",
            created_at=_CREATED, last_login=_UPDATED,
        )
        assert serialize_user(user) == {
            "google_id": "g1",
            "student_id": "alice",
            "email": "a@example.com",
            "name": "Alice",
            "picture": "https://example.com/a.png",
            "created_at": "2026-03-01T00:00:00+00:00",
            "last_login": "2026-03-02T00:00:00+00:00",
        }


class TestSerializeWaitlistEmail:
    """Waitlist rows are a simple email/timestamp pair."""

    def test_maps_all_fields(self):
        """The email and its signup timestamp are returned."""
        assert serialize_waitlist_email(
            SimpleNamespace(email="a@example.com", timestamp=_CREATED)
        ) == {"email": "a@example.com", "timestamp": "2026-03-01T00:00:00+00:00"}
