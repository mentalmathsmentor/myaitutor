"""
Tests for the Postgres-backed storage service: context round-tripping,
upsert semantics, conversation history ordering and token estimation.
The AsyncSession is a fake that records statements and canned results.
"""
import asyncio
from datetime import datetime, timezone

import pytest
from unittest.mock import MagicMock
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import CompileError

from app.db.models import ConversationHistory, StudentContextRecord, User, WaitlistEmail
from app.models import StudentContext
from app.services import storage


class FakeSession:
    """Records executed statements and returns pre-seeded results."""

    def __init__(self, results=None):
        self._results = list(results or [])
        self.statements = []
        self.added = []
        self.commits = 0

    async def execute(self, statement):
        self.statements.append(statement)
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


def _sql(statement) -> str:
    """Compile a statement against the Postgres dialect, inlining literals."""
    try:
        compiled = statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    except CompileError:
        # JSONB payloads cannot be rendered inline; parameter markers are fine.
        compiled = statement.compile(dialect=postgresql.dialect())
    return str(compiled).replace("\n", " ")


def _history(content="hello", row_id=1, role="user"):
    return ConversationHistory(
        id=row_id, student_id="alice", role=role, content=content,
        timestamp=datetime(2026, 3, 1, tzinfo=timezone.utc),
        fatigue_state="FRESH", blooms_level="UNDERSTAND", topic="Calculus",
    )


# ===========================================================================
# Student context
# ===========================================================================

class TestGetContext:
    """get_context revives the stored JSON into a StudentContext."""

    def test_returns_none_when_absent(self):
        """A student with no stored context yields None."""
        assert asyncio.run(storage.get_context(FakeSession(), "alice")) is None

    def test_validates_stored_json(self):
        """The stored JSON payload is validated into the model."""
        stored = StudentContext(student_id="alice")
        stored.session_stats.interactions_count = 3
        row = StudentContextRecord(student_id="alice", context_json=stored.model_dump(mode="json"))
        context = asyncio.run(storage.get_context(FakeSession(results=[row]), "alice"))
        assert isinstance(context, StudentContext)
        assert context.student_id == "alice"
        assert context.session_stats.interactions_count == 3

    def test_invalid_stored_json_raises(self):
        """A corrupt payload fails validation rather than being ignored."""
        row = StudentContextRecord(student_id="alice", context_json={"student_id": "alice", "fatigue_metric": "nope"})
        with pytest.raises(Exception):
            asyncio.run(storage.get_context(FakeSession(results=[row]), "alice"))


class TestSaveContext:
    """save_context upserts on student_id."""

    def test_uses_an_upsert(self):
        """The statement is an INSERT ... ON CONFLICT DO UPDATE."""
        session = FakeSession()
        asyncio.run(storage.save_context(session, "alice", StudentContext(student_id="alice")))
        sql = _sql(session.statements[0])
        assert "INSERT INTO student_context" in sql
        assert "ON CONFLICT (student_id) DO UPDATE" in sql
        assert session.commits == 1

    def test_serialises_the_context_payload(self):
        """The context is stored as JSON-safe values."""
        session = FakeSession()
        context = StudentContext(student_id="alice")
        context.session_stats.interactions_count = 4
        asyncio.run(storage.save_context(session, "alice", context))
        params = session.statements[0].compile(dialect=postgresql.dialect()).params
        assert params["context_json"]["student_id"] == "alice"
        assert params["context_json"]["session_stats"]["interactions_count"] == 4


# ===========================================================================
# Waitlist and visit counter
# ===========================================================================

class TestSaveEmail:
    """save_email ignores duplicate signups."""

    def test_uses_do_nothing_on_conflict(self):
        """A repeated email is silently ignored by the database."""
        session = FakeSession()
        asyncio.run(storage.save_email(session, "a@example.com"))
        sql = _sql(session.statements[0])
        assert "INSERT INTO waitlist_emails" in sql
        assert "ON CONFLICT (email) DO NOTHING" in sql
        assert session.commits == 1


class TestGetAllEmails:
    """get_all_emails serializes rows in signup order."""

    def test_serializes_rows(self):
        """Each waitlist row is serialized."""
        rows = [
            WaitlistEmail(email="a@example.com", timestamp=datetime(2026, 3, 1, tzinfo=timezone.utc)),
            WaitlistEmail(email="b@example.com", timestamp=datetime(2026, 3, 2, tzinfo=timezone.utc)),
        ]
        result = asyncio.run(storage.get_all_emails(FakeSession(results=[rows])))
        assert [row["email"] for row in result] == ["a@example.com", "b@example.com"]

    def test_empty_waitlist_returns_empty_list(self):
        """No signups yields an empty list."""
        assert asyncio.run(storage.get_all_emails(FakeSession(results=[[]]))) == []


class TestVisitCounter:
    """The visit counter is created on demand and incremented atomically."""

    def test_increment_seeds_then_updates_the_row(self):
        """The counter row is upserted, incremented and then read back."""
        session = FakeSession(results=[None, None, 7])
        assert asyncio.run(storage.increment_visit_count(session)) == 7
        assert "ON CONFLICT (id) DO NOTHING" in _sql(session.statements[0])
        assert "UPDATE visit_counter SET count=" in _sql(session.statements[1])
        assert session.commits == 1

    def test_increment_defaults_to_zero_when_unreadable(self):
        """A missing count is reported as zero rather than None."""
        assert asyncio.run(storage.increment_visit_count(FakeSession(results=[None, None, None]))) == 0

    def test_get_returns_the_stored_count(self):
        """The stored count is returned unchanged."""
        assert asyncio.run(storage.get_visit_count(FakeSession(results=[42]))) == 42

    def test_get_defaults_to_zero(self):
        """An uninitialised counter reads as zero."""
        assert asyncio.run(storage.get_visit_count(FakeSession())) == 0


# ===========================================================================
# Conversation history
# ===========================================================================

class TestSaveMessage:
    """save_message inserts a conversation row via the ORM."""

    def test_persists_the_message_with_metadata(self):
        """Role, content and tutoring metadata are stored."""
        session = FakeSession()
        asyncio.run(storage.save_message(
            session, "alice", "user", "What is a derivative?",
            fatigue_state="FRESH", blooms_level="UNDERSTAND", topic="Calculus",
        ))
        message = session.added[0]
        assert message.student_id == "alice"
        assert message.role == "user"
        assert message.content == "What is a derivative?"
        assert message.fatigue_state == "FRESH"
        assert message.blooms_level == "UNDERSTAND"
        assert message.topic == "Calculus"
        assert session.commits == 1

    def test_metadata_is_optional(self):
        """Messages without tutoring metadata are still stored."""
        session = FakeSession()
        asyncio.run(storage.save_message(session, "alice", "assistant", "Sure."))
        assert session.added[0].fatigue_state is None


class TestGetHistory:
    """get_history returns oldest-first rows within the limit."""

    def test_reverses_the_newest_first_query(self):
        """Rows fetched newest-first are returned in chronological order."""
        rows = [_history("newest", 3), _history("middle", 2), _history("oldest", 1)]
        result = asyncio.run(storage.get_history(FakeSession(results=[rows]), "alice"))
        assert [row["content"] for row in result] == ["oldest", "middle", "newest"]

    def test_default_limit_is_twenty(self):
        """The default query fetches at most twenty rows."""
        session = FakeSession(results=[[]])
        asyncio.run(storage.get_history(session, "alice"))
        assert "LIMIT 20" in _sql(session.statements[0])

    def test_limit_is_forwarded(self):
        """An explicit limit is applied to the query."""
        session = FakeSession(results=[[]])
        asyncio.run(storage.get_history(session, "alice", limit=5))
        assert "LIMIT 5" in _sql(session.statements[0])

    def test_empty_history_returns_empty_list(self):
        """A student with no messages yields an empty list."""
        assert asyncio.run(storage.get_history(FakeSession(results=[[]]), "alice")) == []


class TestClearHistory:
    """clear_history deletes only the given student's rows."""

    def test_issues_a_scoped_delete(self):
        """The delete is filtered by student_id and committed."""
        session = FakeSession()
        asyncio.run(storage.clear_history(session, "alice"))
        sql = _sql(session.statements[0])
        assert sql.startswith("DELETE FROM conversation_history")
        assert "student_id" in sql
        assert session.commits == 1


class TestHistoryTokenEstimate:
    """Token usage is estimated at four characters per token."""

    def test_divides_total_characters_by_four(self):
        """The summed content length is divided by four."""
        assert asyncio.run(storage.get_history_token_estimate(FakeSession(results=[400]), "alice")) == 100

    def test_rounds_down(self):
        """Partial tokens are truncated."""
        assert asyncio.run(storage.get_history_token_estimate(FakeSession(results=[7]), "alice")) == 1

    def test_no_history_estimates_zero(self):
        """A NULL sum is treated as zero characters."""
        assert asyncio.run(storage.get_history_token_estimate(FakeSession(), "alice")) == 0


# ===========================================================================
# Users
# ===========================================================================

class TestUpsertUser:
    """upsert_user refreshes profile fields on repeat logins."""

    def test_upserts_on_google_id_and_returns_the_row(self):
        """The row is upserted then read back and serialized."""
        user = User(google_id="g1", student_id="alice", email="a@example.com", name="Alice", picture="")
        session = FakeSession(results=[None, user])
        result = asyncio.run(storage.upsert_user(session, "g1", "alice", email="a@example.com", name="Alice"))
        sql = _sql(session.statements[0])
        assert "ON CONFLICT (google_id) DO UPDATE" in sql
        assert result["student_id"] == "alice"
        assert session.commits == 1

    def test_student_id_is_not_overwritten_on_conflict(self):
        """A repeat login keeps the original student id mapping."""
        session = FakeSession(results=[None, None])
        asyncio.run(storage.upsert_user(session, "g1", "alice"))
        update_clause = _sql(session.statements[0]).split("DO UPDATE SET", 1)[1]
        assert "student_id" not in update_clause


class TestUserLookups:
    """User lookups serialize or return None."""

    def test_lookup_by_google_id(self):
        """A known Google id returns the serialized user."""
        user = User(google_id="g1", student_id="alice", email="a@example.com", name="Alice", picture="")
        assert asyncio.run(storage.get_user_by_google_id(FakeSession(results=[user]), "g1"))["google_id"] == "g1"

    def test_unknown_google_id_returns_none(self):
        """An unknown Google id yields None."""
        assert asyncio.run(storage.get_user_by_google_id(FakeSession(), "g-missing")) is None

    def test_lookup_by_student_id(self):
        """A known student id returns the serialized user."""
        user = User(google_id="g1", student_id="alice", email="a@example.com", name="Alice", picture="")
        assert asyncio.run(storage.get_user_by_student_id(FakeSession(results=[user]), "alice"))["student_id"] == "alice"

    def test_unknown_student_id_returns_none(self):
        """An unknown student id yields None."""
        assert asyncio.run(storage.get_user_by_student_id(FakeSession(), "nobody")) is None
