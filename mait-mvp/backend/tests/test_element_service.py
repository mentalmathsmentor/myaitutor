"""
Tests for the document and element persistence services.
The AsyncSession is replaced with a mock that records adds/deletes and
returns canned query results, so no database is required.
"""
import asyncio

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.db.models import Document, DocumentElement
from app.services import document_service, element_service


class FakeSession:
    """Records ORM mutations and returns pre-seeded query results."""

    def __init__(self, results=None):
        self._results = list(results or [])
        self.added = []
        self.deleted = []
        self.commits = 0
        self.executed = []

    async def execute(self, statement):
        self.executed.append(statement)
        result = MagicMock()
        found = self._results.pop(0) if self._results else None
        result.scalar_one_or_none.return_value = found
        scalars = MagicMock()
        scalars.all.return_value = found if isinstance(found, list) else ([] if found is None else [found])
        result.scalars.return_value = scalars
        return result

    def add(self, instance):
        self.added.append(instance)

    async def delete(self, instance):
        self.deleted.append(instance)

    async def commit(self):
        self.commits += 1

    async def refresh(self, instance):
        return instance


def _document(public_id="doc_1", student_id="alice", **overrides):
    payload = {
        "public_id": public_id,
        "student_id": student_id,
        "title": "Calculus worksheet",
        "kind": "artifact",
        "source": "manual",
        "metadata_json": {},
    }
    payload.update(overrides)
    return Document(**payload)


def _element(document=None, **overrides):
    payload = {
        "public_id": "elem_1",
        "document": document or _document(),
        "sort_key": "a2_b_000",
        "kind": "question",
        "label": "Question 1",
        "content_latex": "\\item A",
        "version_id": "v1",
        "is_locked": False,
        "is_collapsed": False,
    }
    payload.update(overrides)
    return DocumentElement(**payload)


# ===========================================================================
# Documents
# ===========================================================================

class TestCreateDocument:
    """create_document inserts a row and returns the serialized document."""

    def test_persists_and_serializes(self):
        """The new document is added, committed and returned."""
        session = FakeSession()
        result = asyncio.run(document_service.create_document(
            session, student_id="alice", title="Calculus worksheet",
        ))
        assert session.commits == 1
        assert len(session.added) == 1
        assert result["studentId"] == "alice"
        assert result["title"] == "Calculus worksheet"
        assert result["id"].startswith("doc_")

    def test_defaults_kind_and_source(self):
        """Kind and source default to artifact/manual."""
        result = asyncio.run(document_service.create_document(FakeSession(), "alice", "t"))
        assert result["kind"] == "artifact"
        assert result["source"] == "manual"

    def test_metadata_json_string_is_parsed(self):
        """The metadata JSON string is stored as structured data."""
        result = asyncio.run(document_service.create_document(
            FakeSession(), "alice", "t", metadata_json='{"pages": 2}',
        ))
        assert result["metadataJson"] == '{"pages":2}'

    def test_invalid_metadata_json_raises(self):
        """Malformed metadata is rejected before the insert."""
        with pytest.raises(Exception):
            asyncio.run(document_service.create_document(
                FakeSession(), "alice", "t", metadata_json="{oops",
            ))


class TestGetDocument:
    """get_document returns None when the row is missing."""

    def test_returns_serialized_document(self):
        """A found document is serialized."""
        session = FakeSession(results=[_document()])
        assert asyncio.run(document_service.get_document(session, "doc_1"))["id"] == "doc_1"

    def test_missing_document_returns_none(self):
        """An unknown id yields None rather than raising."""
        assert asyncio.run(document_service.get_document(FakeSession(), "doc_missing")) is None

    def test_student_scoped_read_returns_owned_document(self):
        """The owner can read their document."""
        session = FakeSession(results=[_document(student_id="alice")])
        result = asyncio.run(document_service.get_document_for_student(session, "doc_1", "alice"))
        assert result["studentId"] == "alice"

    def test_student_scoped_read_hides_other_documents(self):
        """Another student's document is reported as missing."""
        assert asyncio.run(document_service.get_document_for_student(FakeSession(), "doc_1", "bob")) is None


class TestListDocuments:
    """get_documents_by_student serializes each row."""

    def test_returns_all_documents(self):
        """Every document of the student is serialized."""
        rows = [_document(public_id="doc_1"), _document(public_id="doc_2")]
        result = asyncio.run(document_service.get_documents_by_student(FakeSession(results=[rows]), "alice"))
        assert [row["id"] for row in result] == ["doc_1", "doc_2"]

    def test_no_documents_returns_empty_list(self):
        """A student with no documents gets an empty list."""
        assert asyncio.run(document_service.get_documents_by_student(FakeSession(results=[[]]), "alice")) == []


class TestUpdateDocumentTitle:
    """Renaming reports whether a row was found."""

    def test_renames_and_stamps_the_document(self):
        """The title and updated_at are both changed."""
        document = _document()
        session = FakeSession(results=[document])
        assert asyncio.run(document_service.update_document_title(session, "doc_1", "New title")) is True
        assert document.title == "New title"
        assert document.updated_at is not None
        assert session.commits == 1

    def test_missing_document_returns_false(self):
        """Renaming an unknown document is a no-op."""
        session = FakeSession()
        assert asyncio.run(document_service.update_document_title(session, "doc_x", "New")) is False
        assert session.commits == 0

    def test_student_scoped_rename_requires_ownership(self):
        """Another student's document cannot be renamed."""
        session = FakeSession()
        result = asyncio.run(document_service.update_document_title_for_student(
            session, "doc_1", "bob", "New",
        ))
        assert result is False
        assert session.commits == 0

    def test_student_scoped_rename_applies_to_owner(self):
        """The owner's document is renamed."""
        document = _document()
        result = asyncio.run(document_service.update_document_title_for_student(
            FakeSession(results=[document]), "doc_1", "alice", "New title",
        ))
        assert result is True
        assert document.title == "New title"


class TestDeleteDocument:
    """Deletion reports whether a row was removed."""

    def test_deletes_existing_document(self):
        """An existing document is deleted and committed."""
        document = _document()
        session = FakeSession(results=[document])
        assert asyncio.run(document_service.delete_document(session, "doc_1")) is True
        assert session.deleted == [document]
        assert session.commits == 1

    def test_missing_document_returns_false(self):
        """Deleting an unknown document is a no-op."""
        session = FakeSession()
        assert asyncio.run(document_service.delete_document(session, "doc_x")) is False
        assert session.deleted == []

    def test_student_scoped_delete_requires_ownership(self):
        """Another student's document cannot be deleted."""
        session = FakeSession()
        assert asyncio.run(document_service.delete_document_for_student(session, "doc_1", "bob")) is False
        assert session.deleted == []

    def test_student_scoped_delete_removes_owned_document(self):
        """The owner's document is deleted."""
        document = _document()
        session = FakeSession(results=[document])
        assert asyncio.run(document_service.delete_document_for_student(session, "doc_1", "alice")) is True
        assert session.deleted == [document]


# ===========================================================================
# Element creation
# ===========================================================================

class TestCreateElement:
    """create_element requires its parent document to exist."""

    def test_creates_element_under_document(self):
        """The element is linked to the document and serialized."""
        session = FakeSession(results=[_document()])
        result = asyncio.run(element_service.create_element(
            session, document_id="doc_1", sort_key="a2_b_000", kind="question",
        ))
        assert session.commits == 1
        assert result["documentId"] == "doc_1"
        assert result["sortKey"] == "a2_b_000"
        assert result["kind"] == "question"
        assert result["id"].startswith("elem_")

    def test_defaults_are_applied(self):
        """Label, version and flags fall back to their defaults."""
        session = FakeSession(results=[_document()])
        result = asyncio.run(element_service.create_element(
            session, document_id="doc_1", sort_key="a1", kind="text_block",
        ))
        assert result["label"] == "Element"
        assert result["versionId"] == "v1"
        assert result["isLocked"] is False
        assert result["isCollapsed"] is False

    def test_missing_document_raises(self):
        """Creating an element for an unknown document is an error."""
        session = FakeSession()
        with pytest.raises(ValueError, match="Document doc_missing not found"):
            asyncio.run(element_service.create_element(
                session, document_id="doc_missing", sort_key="a1", kind="question",
            ))
        assert session.commits == 0

    def test_student_scoped_creation_checks_ownership(self):
        """A student may only add elements to their own document."""
        session = FakeSession()
        with pytest.raises(ValueError, match="not found"):
            asyncio.run(element_service.create_element_for_student(
                session, document_id="doc_1", student_id="bob", sort_key="a1", kind="question",
            ))

    def test_student_scoped_creation_succeeds_for_owner(self):
        """The owner can add an element to their document."""
        session = FakeSession(results=[_document(student_id="alice")])
        result = asyncio.run(element_service.create_element_for_student(
            session, document_id="doc_1", student_id="alice", sort_key="a1",
            kind="question", content_latex="\\item A", is_locked=True,
        ))
        assert result["contentLatex"] == "\\item A"
        assert result["isLocked"] is True


# ===========================================================================
# Element reads
# ===========================================================================

class TestGetElements:
    """get_elements serializes every row returned by the query."""

    def test_returns_all_elements(self):
        """Each row is serialized in query order."""
        document = _document()
        rows = [
            _element(document=document, public_id="elem_1", sort_key="a1"),
            _element(document=document, public_id="elem_2", sort_key="a2"),
        ]
        result = asyncio.run(element_service.get_elements(FakeSession(results=[rows]), "doc_1"))
        assert [row["id"] for row in result] == ["elem_1", "elem_2"]

    def test_empty_document_returns_empty_list(self):
        """A document with no elements yields an empty list."""
        assert asyncio.run(element_service.get_elements(FakeSession(results=[[]]), "doc_1")) == []

    def test_student_scoped_read_returns_elements(self):
        """The student-scoped read serializes the same way."""
        rows = [_element(public_id="elem_1")]
        result = asyncio.run(element_service.get_elements_for_student(
            FakeSession(results=[rows]), "doc_1", "alice",
        ))
        assert result[0]["id"] == "elem_1"


# ===========================================================================
# Element updates
# ===========================================================================

class TestUpdateElement:
    """update_element maps camelCase keys and ignores unknown columns."""

    def test_maps_camel_case_updates(self):
        """API field names are translated to column names."""
        element = _element()
        session = FakeSession(results=[element])
        result = asyncio.run(element_service.update_element(session, "elem_1", {
            "contentLatex": "\\item updated",
            "isLocked": True,
        }))
        assert element.content_latex == "\\item updated"
        assert element.is_locked is True
        assert result["contentLatex"] == "\\item updated"
        assert session.commits == 1

    def test_accepts_snake_case_columns(self):
        """Column names may also be passed directly."""
        element = _element()
        asyncio.run(element_service.update_element(FakeSession(results=[element]), "elem_1", {
            "sort_key": "a9",
        }))
        assert element.sort_key == "a9"

    def test_updated_at_is_refreshed(self):
        """A successful update stamps updated_at."""
        element = _element()
        asyncio.run(element_service.update_element(FakeSession(results=[element]), "elem_1", {"label": "New"}))
        assert element.updated_at is not None

    def test_empty_updates_are_a_no_op(self):
        """An empty payload returns None without touching the session."""
        session = FakeSession()
        assert asyncio.run(element_service.update_element(session, "elem_1", {})) is None
        assert session.executed == []

    def test_unknown_fields_are_rejected(self):
        """A payload of only unknown fields does not run a query."""
        session = FakeSession()
        assert asyncio.run(element_service.update_element(session, "elem_1", {"hacker": 1})) is None
        assert session.executed == []

    def test_missing_element_returns_none(self):
        """Updating an unknown element returns None without committing."""
        session = FakeSession()
        assert asyncio.run(element_service.update_element(session, "elem_x", {"label": "New"})) is None
        assert session.commits == 0

    def test_student_scoped_update_requires_ownership(self):
        """Another student's element cannot be updated."""
        session = FakeSession()
        result = asyncio.run(element_service.update_element_for_student(
            session, "elem_1", "bob", {"label": "New"},
        ))
        assert result is None
        assert session.commits == 0

    def test_student_scoped_update_applies_changes(self):
        """The owner's update is applied and serialized."""
        element = _element()
        result = asyncio.run(element_service.update_element_for_student(
            FakeSession(results=[element]), "elem_1", "alice", {"isCollapsed": True},
        ))
        assert element.is_collapsed is True
        assert result["isCollapsed"] is True

    def test_student_scoped_update_ignores_empty_payload(self):
        """An empty payload short-circuits the student-scoped update too."""
        session = FakeSession()
        assert asyncio.run(element_service.update_element_for_student(session, "elem_1", "alice", {})) is None
        assert session.executed == []

    def test_student_scoped_update_rejects_unknown_fields(self):
        """Unknown fields are filtered out before querying."""
        session = FakeSession()
        result = asyncio.run(element_service.update_element_for_student(
            session, "elem_1", "alice", {"documentId": "doc_2"},
        ))
        assert result is None
        assert session.executed == []


# ===========================================================================
# Element deletion
# ===========================================================================

class TestDeleteElement:
    """delete_element reports whether a row was removed."""

    def test_deletes_existing_element(self):
        """An existing element is deleted and committed."""
        element = _element()
        session = FakeSession(results=[element])
        assert asyncio.run(element_service.delete_element(session, "elem_1")) is True
        assert session.deleted == [element]
        assert session.commits == 1

    def test_missing_element_returns_false(self):
        """Deleting an unknown element is a no-op."""
        session = FakeSession()
        assert asyncio.run(element_service.delete_element(session, "elem_x")) is False
        assert session.commits == 0

    def test_student_scoped_delete_requires_ownership(self):
        """Another student's element cannot be deleted."""
        session = FakeSession()
        assert asyncio.run(element_service.delete_element_for_student(session, "elem_1", "bob")) is False
        assert session.deleted == []

    def test_student_scoped_delete_removes_owned_element(self):
        """The owner's element is deleted."""
        element = _element()
        session = FakeSession(results=[element])
        assert asyncio.run(element_service.delete_element_for_student(session, "elem_1", "alice")) is True
        assert session.deleted == [element]
