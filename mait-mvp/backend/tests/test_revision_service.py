"""
Tests for the per-element AI revision service: prompt construction,
Gemini failure bookkeeping, apply/reject state transitions and listing.
Gemini is mocked and the AsyncSession is a recording fake.
"""
import asyncio
import sys

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.db.models import Document, DocumentElement, DocumentRevision
from app.services import revision_service
from app.services.revision_service import (
    FRAGMENT_REVISION_SYSTEM_PROMPT,
    _build_revision_prompt,
    apply_revision,
    apply_revision_for_student,
    create_revision,
    create_revision_for_student,
    list_revisions,
    list_revisions_for_student,
    reject_revision,
    reject_revision_for_student,
)


class FakeSession:
    """Returns pre-seeded query results and records ORM mutations."""

    def __init__(self, results=None):
        self._results = list(results or [])
        self.added = []
        self.commits = 0

    async def execute(self, statement):
        found = self._results.pop(0) if self._results else None
        result = MagicMock()
        result.scalar_one_or_none.return_value = None if isinstance(found, list) else found
        scalars = MagicMock()
        scalars.all.return_value = found if isinstance(found, list) else ([] if found is None else [found])
        result.scalars.return_value = scalars
        return result

    def add(self, instance):
        self.added.append(instance)

    async def commit(self):
        self.commits += 1

    async def refresh(self, instance):
        return instance


def _document(student_id="alice"):
    return Document(
        public_id="doc_1", student_id=student_id, title="Worksheet",
        kind="artifact", source="manual", metadata_json={},
    )


def _element(document=None, content_latex="\\item Solve x^2 = 4", **overrides):
    payload = {
        "public_id": "elem_1",
        "document": document or _document(),
        "sort_key": "a1",
        "kind": "question",
        "label": "Question 1",
        "content_latex": content_latex,
        "version_id": "v1",
        "is_locked": False,
        "is_collapsed": False,
    }
    payload.update(overrides)
    return DocumentElement(**payload)


def _revision(element=None, status="pending", output_snapshot="\\item Solve x^2 = 9"):
    document = _document()
    return DocumentRevision(
        public_id="rev_1",
        document=document,
        element=element if element is not None else _element(document),
        instruction_text="Make it harder",
        provider="gemini",
        input_snapshot="\\item Solve x^2 = 4",
        output_snapshot=output_snapshot,
        status=status,
    )


def _mock_client(response_text=None, side_effect=None):
    client = MagicMock()
    if side_effect is not None:
        client.aio.models.generate_content = AsyncMock(side_effect=side_effect)
    else:
        client.aio.models.generate_content = AsyncMock(return_value=MagicMock(text=response_text))
    return client


@pytest.fixture
def genai_types():
    """The stubbed google.genai.types module, with call history cleared."""
    types_module = sys.modules["google.genai"].types
    types_module.reset_mock()
    return types_module


# ===========================================================================
# Prompt construction
# ===========================================================================

class TestBuildRevisionPrompt:
    """The prompt carries the fragment, its metadata and the instruction."""

    def test_includes_all_inputs(self):
        """Kind, label, current content and instruction are all present."""
        prompt = _build_revision_prompt("question", "Question 1", "\\item Solve", "Add a part (b)")
        assert "FRAGMENT KIND: question" in prompt
        assert "FRAGMENT LABEL: Question 1" in prompt
        assert "\\item Solve" in prompt
        assert "INSTRUCTION: Add a part (b)" in prompt


# ===========================================================================
# create_revision
# ===========================================================================

class TestCreateRevision:
    """A pending revision row is written for a successful Gemini call."""

    def test_stores_a_pending_revision(self):
        """The model output is stored as the pending output snapshot."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client("  \\item Solve x^2 = 9  ")):
            result = asyncio.run(create_revision(session, "elem_1", "Make it harder"))
        assert result["status"] == "pending"
        assert result["output_snapshot"] == "\\item Solve x^2 = 9"
        assert result["input_snapshot"] == "\\item Solve x^2 = 4"
        assert result["instruction_text"] == "Make it harder"
        assert result["provider"] == "gemini"
        assert result["id"].startswith("rev_")
        assert session.commits == 1

    def test_links_the_revision_to_its_document_and_element(self):
        """The stored row points at the revised element and its document."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client("out")):
            result = asyncio.run(create_revision(session, "elem_1", "Tweak"))
        assert result["document_id"] == "doc_1"
        assert result["element_id"] == "elem_1"

    def test_missing_element_raises_before_calling_gemini(self):
        """An unknown element is rejected without an API call."""
        client = _mock_client("out")
        session = FakeSession()
        with patch.object(revision_service, "get_client", return_value=client):
            with pytest.raises(ValueError, match="Element elem_x not found"):
                asyncio.run(create_revision(session, "elem_x", "Tweak"))
        client.aio.models.generate_content.assert_not_awaited()
        assert session.commits == 0

    def test_empty_content_becomes_an_empty_snapshot(self):
        """An element with no LaTeX still produces a valid snapshot."""
        session = FakeSession(results=[_element(content_latex=None)])
        with patch.object(revision_service, "get_client", return_value=_mock_client("out")):
            result = asyncio.run(create_revision(session, "elem_1", "Tweak"))
        assert result["input_snapshot"] == ""

    def test_configures_the_revision_system_prompt(self, genai_types):
        """The fragment-editor system prompt and limits are applied."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client("out")):
            asyncio.run(create_revision(session, "elem_1", "Tweak"))
        config_kwargs = genai_types.GenerateContentConfig.call_args.kwargs
        assert config_kwargs["system_instruction"] == FRAGMENT_REVISION_SYSTEM_PROMPT
        assert config_kwargs["max_output_tokens"] == 1500
        assert config_kwargs["temperature"] == 0.3

    def test_gemini_failure_records_a_failed_revision(self):
        """A failed call is persisted with status 'failed' and re-raised."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client(side_effect=RuntimeError("boom"))):
            with pytest.raises(RuntimeError, match="Gemini revision failed: boom"):
                asyncio.run(create_revision(session, "elem_1", "Tweak"))
        assert session.commits == 1
        assert session.added[0].status == "failed"
        assert session.added[0].output_snapshot == ""

    def test_timeout_is_recorded_as_a_failure(self):
        """A timeout is treated like any other Gemini failure."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client(side_effect=asyncio.TimeoutError())):
            with pytest.raises(RuntimeError, match="Gemini revision failed"):
                asyncio.run(create_revision(session, "elem_1", "Tweak"))
        assert session.added[0].status == "failed"


class TestCreateRevisionForStudent:
    """The student-scoped variant enforces document ownership."""

    def test_owner_gets_a_pending_revision(self):
        """The owner's element can be revised."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client("revised")):
            result = asyncio.run(create_revision_for_student(session, "elem_1", "alice", "Tweak"))
        assert result["status"] == "pending"
        assert result["output_snapshot"] == "revised"

    def test_non_owner_is_rejected(self):
        """Another student's element is reported as not found."""
        client = _mock_client("revised")
        with patch.object(revision_service, "get_client", return_value=client):
            with pytest.raises(ValueError, match="Element elem_1 not found"):
                asyncio.run(create_revision_for_student(FakeSession(), "elem_1", "bob", "Tweak"))
        client.aio.models.generate_content.assert_not_awaited()

    def test_gemini_failure_records_a_failed_revision(self):
        """Failures are recorded for the student-scoped path too."""
        session = FakeSession(results=[_element()])
        with patch.object(revision_service, "get_client", return_value=_mock_client(side_effect=RuntimeError("boom"))):
            with pytest.raises(RuntimeError, match="Gemini revision failed"):
                asyncio.run(create_revision_for_student(session, "elem_1", "alice", "Tweak"))
        assert session.added[0].status == "failed"


# ===========================================================================
# apply / reject
# ===========================================================================

class TestApplyRevision:
    """Applying a revision writes its output back onto the element."""

    def test_element_content_is_replaced(self):
        """The element takes on the revision's output snapshot."""
        revision = _revision()
        session = FakeSession(results=[revision])
        result = asyncio.run(apply_revision(session, "rev_1"))
        assert revision.element.content_latex == "\\item Solve x^2 = 9"
        assert revision.element.updated_at is not None
        assert result["status"] == "applied"
        assert session.commits == 1

    def test_missing_revision_raises(self):
        """An unknown revision id is an error."""
        with pytest.raises(ValueError, match="Revision rev_x not found"):
            asyncio.run(apply_revision(FakeSession(), "rev_x"))

    def test_non_pending_revision_raises(self):
        """Only pending revisions may be applied."""
        session = FakeSession(results=[_revision(status="applied")])
        with pytest.raises(ValueError, match="not pending \\(status=applied\\)"):
            asyncio.run(apply_revision(session, "rev_1"))
        assert session.commits == 0

    def test_detached_revision_is_still_marked_applied(self):
        """A revision whose element was deleted can still be closed out."""
        session = FakeSession(results=[_revision(element=None)])
        assert asyncio.run(apply_revision(session, "rev_1"))["status"] == "applied"

    def test_student_scoped_apply_updates_the_element(self):
        """The owner's revision is applied to their element."""
        revision = _revision()
        result = asyncio.run(apply_revision_for_student(FakeSession(results=[revision]), "rev_1", "alice"))
        assert revision.element.content_latex == "\\item Solve x^2 = 9"
        assert result["status"] == "applied"

    def test_student_scoped_apply_rejects_other_students(self):
        """Another student's revision is reported as not found."""
        with pytest.raises(ValueError, match="Revision rev_1 not found"):
            asyncio.run(apply_revision_for_student(FakeSession(), "rev_1", "bob"))

    def test_student_scoped_apply_requires_pending_status(self):
        """A rejected revision cannot be applied."""
        session = FakeSession(results=[_revision(status="rejected")])
        with pytest.raises(ValueError, match="not pending"):
            asyncio.run(apply_revision_for_student(session, "rev_1", "alice"))


class TestRejectRevision:
    """Rejecting leaves the element untouched."""

    def test_marks_the_revision_rejected(self):
        """The status becomes 'rejected' and content is unchanged."""
        revision = _revision()
        session = FakeSession(results=[revision])
        result = asyncio.run(reject_revision(session, "rev_1"))
        assert result["status"] == "rejected"
        assert revision.element.content_latex == "\\item Solve x^2 = 4"
        assert session.commits == 1

    def test_missing_revision_raises(self):
        """An unknown revision id is an error."""
        with pytest.raises(ValueError, match="Revision rev_x not found"):
            asyncio.run(reject_revision(FakeSession(), "rev_x"))

    def test_already_applied_revision_can_be_rejected(self):
        """Rejection is not restricted to pending revisions."""
        session = FakeSession(results=[_revision(status="applied")])
        assert asyncio.run(reject_revision(session, "rev_1"))["status"] == "rejected"

    def test_student_scoped_reject_marks_the_revision(self):
        """The owner can reject their revision."""
        result = asyncio.run(reject_revision_for_student(FakeSession(results=[_revision()]), "rev_1", "alice"))
        assert result["status"] == "rejected"

    def test_student_scoped_reject_rejects_other_students(self):
        """Another student's revision is reported as not found."""
        with pytest.raises(ValueError, match="Revision rev_1 not found"):
            asyncio.run(reject_revision_for_student(FakeSession(), "rev_1", "bob"))


# ===========================================================================
# Listing
# ===========================================================================

class TestListRevisions:
    """Listing is scoped by document and optionally by element."""

    def test_returns_serialized_revisions(self):
        """Every revision of the document is serialized."""
        session = FakeSession(results=[_document(), [_revision(), _revision()]])
        assert len(asyncio.run(list_revisions(session, "doc_1"))) == 2

    def test_unknown_document_returns_empty(self):
        """A missing document yields an empty list."""
        assert asyncio.run(list_revisions(FakeSession(), "doc_x")) == []

    def test_element_filter_requires_the_element_to_exist(self):
        """An element filter that matches nothing yields an empty list."""
        session = FakeSession(results=[_document(), None])
        assert asyncio.run(list_revisions(session, "doc_1", element_id="elem_x")) == []

    def test_element_filter_narrows_the_result(self):
        """A valid element filter returns that element's revisions."""
        session = FakeSession(results=[_document(), _element(), [_revision()]])
        result = asyncio.run(list_revisions(session, "doc_1", element_id="elem_1"))
        assert [row["element_id"] for row in result] == ["elem_1"]

    def test_student_scoped_listing_returns_revisions(self):
        """The owner sees their document's revisions."""
        session = FakeSession(results=[_document(), [_revision()]])
        assert len(asyncio.run(list_revisions_for_student(session, "doc_1", "alice"))) == 1

    def test_student_scoped_listing_hides_other_documents(self):
        """A document owned by someone else lists nothing."""
        assert asyncio.run(list_revisions_for_student(FakeSession(), "doc_1", "bob")) == []

    def test_student_scoped_element_filter_requires_the_element(self):
        """A missing element in the student-scoped path yields an empty list."""
        session = FakeSession(results=[_document(), None])
        assert asyncio.run(list_revisions_for_student(session, "doc_1", "alice", element_id="elem_x")) == []

    def test_student_scoped_element_filter_narrows_the_result(self):
        """A valid element filter narrows the student-scoped listing."""
        session = FakeSession(results=[_document(), _element(), [_revision()]])
        result = asyncio.run(list_revisions_for_student(session, "doc_1", "alice", element_id="elem_1"))
        assert len(result) == 1
