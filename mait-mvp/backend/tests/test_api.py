"""
Tests for FastAPI endpoints using TestClient.
All external services (Gemini API, SQLite storage) are mocked.
"""
import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from datetime import datetime

from fastapi.testclient import TestClient

from app.main import app, classify_typing_speed
from app.models import FatigueStatus, StudentContext, KeystrokeMetrics


# ---------------------------------------------------------------------------
# Storage mock: replace the async SQLite storage with an in-memory dict
# ---------------------------------------------------------------------------

_mock_store: dict = {}


async def _mock_init_db():
    """No-op database init."""
    _mock_store.clear()


async def _mock_get_context(_session, student_id: str):
    """Retrieve context from in-memory store."""
    return _mock_store.get(student_id)


async def _mock_save_context(_session, student_id: str, context: StudentContext):
    """Save context to in-memory store."""
    _mock_store[student_id] = context


async def _mock_save_email(_session, email: str):
    """Save email to in-memory store."""
    _mock_store.setdefault("__emails__", []).append(email)


async def _mock_clear_history(_session, student_id: str):
    """Clear mocked conversation history for a student."""
    _mock_store.pop(f"history:{student_id}", None)


async def _mock_get_history(_session, student_id: str, limit: int = 20):
    history = _mock_store.get(f"history:{student_id}", [])
    return history[-limit:]


async def _mock_save_message(
    _session,
    student_id: str,
    role: str,
    content: str,
    fatigue_state: str = None,
    blooms_level: str = None,
    topic: str = None,
):
    history = _mock_store.setdefault(f"history:{student_id}", [])
    history.append(
        {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "fatigue_state": fatigue_state,
            "blooms_level": blooms_level,
            "topic": topic,
        }
    )


async def _mock_get_history_token_estimate(_session, student_id: str):
    history = _mock_store.get(f"history:{student_id}", [])
    return sum(len(msg["content"]) for msg in history) // 4


async def _mock_increment_visit_count(_session):
    _mock_store["visit_count"] = _mock_store.get("visit_count", 0) + 1
    return _mock_store["visit_count"]


async def _mock_get_visit_count(_session):
    return _mock_store.get("visit_count", 0)


@pytest.fixture(autouse=True)
def mock_storage():
    """Patch the storage module so no real SQLite database is used."""
    _mock_store.clear()
    init_db_mock = AsyncMock(side_effect=_mock_init_db)
    get_context_mock = AsyncMock(side_effect=_mock_get_context)
    save_context_mock = AsyncMock(side_effect=_mock_save_context)
    save_email_mock = AsyncMock(side_effect=_mock_save_email)
    clear_history_mock = AsyncMock(side_effect=_mock_clear_history)
    get_history_mock = AsyncMock(side_effect=_mock_get_history)
    save_message_mock = AsyncMock(side_effect=_mock_save_message)
    get_history_token_estimate_mock = AsyncMock(side_effect=_mock_get_history_token_estimate)
    increment_visit_count_mock = AsyncMock(side_effect=_mock_increment_visit_count)
    get_visit_count_mock = AsyncMock(side_effect=_mock_get_visit_count)

    with patch("app.services.storage.init_db", new=init_db_mock), \
        patch("app.services.storage.get_context", new=get_context_mock), \
        patch("app.services.storage.save_context", new=save_context_mock), \
        patch("app.services.storage.save_email", new=save_email_mock), \
        patch("app.services.storage.clear_history", new=clear_history_mock), \
        patch("app.services.storage.get_history", new=get_history_mock), \
        patch("app.services.storage.save_message", new=save_message_mock), \
        patch(
            "app.services.storage.get_history_token_estimate",
            new=get_history_token_estimate_mock,
        ), \
        patch("app.services.storage.increment_visit_count", new=increment_visit_count_mock), \
        patch("app.services.storage.get_visit_count", new=get_visit_count_mock):
        yield SimpleNamespace(
            init_db=init_db_mock,
            get_context=get_context_mock,
            save_context=save_context_mock,
            save_email=save_email_mock,
            clear_history=clear_history_mock,
            get_history=get_history_mock,
            save_message=save_message_mock,
            get_history_token_estimate=get_history_token_estimate_mock,
            increment_visit_count=increment_visit_count_mock,
            get_visit_count=get_visit_count_mock,
        )
    _mock_store.clear()


@pytest.fixture
def client():
    """Create a TestClient for the FastAPI app."""
    class StudentHeaderClient:
        def __init__(self):
            self._client = TestClient(app)

        def _student_id_for(self, url: str, kwargs: dict) -> str:
            body = kwargs.get("json")
            if isinstance(body, dict) and isinstance(body.get("student_id"), str):
                return body["student_id"]

            parts = str(url).split("?", 1)[0].strip("/").split("/")
            if len(parts) >= 2 and parts[0] in {"context", "history", "keystroke-profile", "reset"}:
                return parts[1]

            return "default_user"

        def _request(self, method: str, url: str, **kwargs):
            headers = dict(kwargs.pop("headers", {}) or {})
            headers.setdefault("X-Student-Id", self._student_id_for(url, kwargs))
            return getattr(self._client, method)(url, headers=headers, **kwargs)

        def get(self, url: str, **kwargs):
            return self._request("get", url, **kwargs)

        def post(self, url: str, **kwargs):
            return self._request("post", url, **kwargs)

        def delete(self, url: str, **kwargs):
            return self._request("delete", url, **kwargs)

        def put(self, url: str, **kwargs):
            return self._request("put", url, **kwargs)

        def __getattr__(self, name: str):
            return getattr(self._client, name)

    return StudentHeaderClient()


# ===========================================================================
# GET /
# ===========================================================================

class TestRootEndpoint:
    """Tests for the root health-check endpoint."""

    def test_root_returns_status_online(self, client):
        """GET / should return status: online."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert data["system"] == "MAIT MVP"


# ===========================================================================
# GET /context/{student_id}
# ===========================================================================

class TestContextEndpoint:
    """Tests for the context retrieval endpoint."""

    def test_creates_new_context_for_unknown_student(self, client):
        """GET /context/new_student should create and return a fresh context."""
        response = client.get("/context/new_student")
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == "new_student"
        assert data["fatigue_metric"]["current_score"] == 0
        assert data["fatigue_metric"]["status"] == "FRESH"

    def test_returns_existing_context(self, client):
        """Subsequent calls should return the same context."""
        client.get("/context/alice")
        response = client.get("/context/alice")
        assert response.status_code == 200
        assert response.json()["student_id"] == "alice"

    def test_different_students_get_different_contexts(self, client):
        """Different student IDs should have independent contexts."""
        r1 = client.get("/context/alice")
        r2 = client.get("/context/bob")
        assert r1.json()["student_id"] == "alice"
        assert r2.json()["student_id"] == "bob"


# ===========================================================================
# POST /interact
# ===========================================================================

class TestInteractEndpoint:
    """Tests for the /interact endpoint (main chat interaction)."""

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_returns_response(self, mock_generate, client):
        """POST /interact should return a response from the educational agent."""
        mock_generate.return_value = "This is a test response about math."

        response = client.post("/interact", json={
            "student_id": "alice",
            "query": "What is a derivative?",
            "complexity": 3,
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "context" in data
        assert data["response"] == "This is a test response about math."

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_updates_fatigue(self, mock_generate, client):
        """POST /interact should increase the fatigue score."""
        mock_generate.return_value = "Response text."

        response = client.post("/interact", json={
            "student_id": "alice",
            "query": "Explain integrals",
        })
        data = response.json()
        assert data["context"]["fatigue_metric"]["current_score"] > 0

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_default_student_id(self, mock_generate, client):
        """POST /interact without student_id should use default_user."""
        mock_generate.return_value = "Response."
        response = client.post("/interact", json={
            "query": "Hello",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["context"]["student_id"] == "default_user"

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_lockout_returns_lockout_message(self, mock_generate, client):
        """When a student is in LOCKOUT, /interact should return a lockout message."""
        # Pre-set the session to lockout state
        ctx = StudentContext(student_id="tired_alice")
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
        _mock_store["tired_alice"] = ctx

        response = client.post("/interact", json={
            "student_id": "tired_alice",
            "query": "One more question",
        })
        data = response.json()
        assert "LOCKOUT" in data["response"] or "break" in data["response"].lower()
        # Agent should NOT have been called during lockout
        mock_generate.assert_not_called()

    def test_interact_missing_query_returns_422(self, client):
        """POST /interact without a query should return 422."""
        response = client.post("/interact", json={
            "student_id": "alice",
        })
        assert response.status_code == 422

    def test_interact_empty_query_returns_422(self, client):
        """POST /interact with an empty query should return 422."""
        response = client.post("/interact", json={
            "student_id": "alice",
            "query": "",
        })
        assert response.status_code == 422

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_complexity_bounds(self, mock_generate, client):
        """Complexity values outside [1, 10] should return 422."""
        mock_generate.return_value = "Response."

        # Too low
        resp_low = client.post("/interact", json={
            "student_id": "alice",
            "query": "Test",
            "complexity": 0,
        })
        assert resp_low.status_code == 422

        # Too high
        resp_high = client.post("/interact", json={
            "student_id": "alice",
            "query": "Test",
            "complexity": 11,
        })
        assert resp_high.status_code == 422

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_interact_returns_blooms_level(self, mock_generate, client):
        """POST /interact should include blooms_level in the response."""
        mock_generate.return_value = "Test response."

        response = client.post("/interact", json={
            "student_id": "alice",
            "query": "What is a polynomial?",
        })
        data = response.json()
        assert "blooms_level" in data
        assert "mastery_score" in data


# ===========================================================================
# POST /reset/{student_id}
# ===========================================================================

class TestResetEndpoint:
    """Tests for the /reset endpoint."""

    @patch("app.services.educational_agent.generate_response_async", new_callable=AsyncMock)
    def test_reset_clears_fatigue(self, mock_generate, client):
        """POST /reset should return a fresh context with score=0."""
        mock_generate.return_value = "Response."

        # First, interact to build up fatigue
        client.post("/interact", json={
            "student_id": "alice",
            "query": "Question 1",
        })

        # Then reset
        response = client.post("/reset/alice")
        assert response.status_code == 200
        data = response.json()
        assert data["context"]["fatigue_metric"]["current_score"] == 0
        assert data["context"]["fatigue_metric"]["status"] == "FRESH"
        assert data["context"]["student_id"] == "alice"

    def test_reset_nonexistent_student(self, client):
        """Resetting a non-existent student should create a fresh context."""
        response = client.post("/reset/ghost")
        assert response.status_code == 200
        data = response.json()
        assert data["context"]["student_id"] == "ghost"
        assert data["context"]["fatigue_metric"]["current_score"] == 0


# ===========================================================================
# POST /keystroke-metrics
# ===========================================================================

class TestKeystrokeMetricsEndpoint:
    """Tests for the keystroke metrics submission endpoint."""

    def test_submit_keystroke_metrics(self, client):
        """POST /keystroke-metrics should store metrics and return profile."""
        response = client.post("/keystroke-metrics", json={
            "student_id": "alice",
            "metrics": {
                "wpm": 55.0,
                "avg_dwell_time_ms": 110.0,
                "avg_flight_time_ms": 70.0,
                "avg_thinking_time_ms": 3500.0,
                "total_thinking_time_ms": 15000.0,
                "error_corrections": 3,
                "error_rate": 1.5,
                "characters_typed": 200,
                "session_duration_ms": 60000,
                "rhythm_variance": 8000.0,
                "keystroke_count": 220,
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["profile"]["total_sessions"] == 1
        assert data["profile"]["average_wpm"] == 55.0

    def test_submit_multiple_sessions_averages(self, client):
        """Submitting multiple sessions should produce weighted averages."""
        metrics_1 = {
            "student_id": "alice",
            "metrics": {
                "wpm": 50.0,
                "avg_dwell_time_ms": 100.0,
                "avg_flight_time_ms": 80.0,
                "avg_thinking_time_ms": 3000.0,
                "characters_typed": 100,
                "error_corrections": 2,
                "rhythm_variance": 5000.0,
            }
        }
        metrics_2 = {
            "student_id": "alice",
            "metrics": {
                "wpm": 70.0,
                "avg_dwell_time_ms": 90.0,
                "avg_flight_time_ms": 60.0,
                "avg_thinking_time_ms": 2000.0,
                "characters_typed": 150,
                "error_corrections": 1,
                "rhythm_variance": 10000.0,
            }
        }

        client.post("/keystroke-metrics", json=metrics_1)
        response = client.post("/keystroke-metrics", json=metrics_2)
        data = response.json()

        assert data["profile"]["total_sessions"] == 2
        # Weighted average: (50 * 0.5) + (70 * 0.5) = 60
        assert data["profile"]["average_wpm"] == 60.0
        assert data["profile"]["total_characters_typed"] == 250
        assert data["profile"]["total_error_corrections"] == 3

    def test_submit_metrics_classifies_behavior(self, client):
        """Submitting metrics should populate behavioral classification fields."""
        response = client.post("/keystroke-metrics", json={
            "student_id": "alice",
            "metrics": {
                "wpm": 65.0,
                "avg_dwell_time_ms": 100.0,
                "avg_flight_time_ms": 70.0,
                "avg_thinking_time_ms": 6000.0,
                "characters_typed": 200,
                "error_corrections": 3,
                "rhythm_variance": 4000.0,
            }
        })
        data = response.json()
        profile = data["profile"]
        assert profile["typing_speed_category"] == "fast"  # wpm > 60
        assert profile["consistency_category"] == "very_consistent"  # variance < 5000
        assert profile["thinking_pattern"] == "thoughtful"  # 5000 < 6000 < 10000

    def test_session_history_capped_at_50(self, client):
        """Session history should keep only the last 50 sessions."""
        for i in range(55):
            client.post("/keystroke-metrics", json={
                "student_id": "alice",
                "metrics": {
                    "wpm": 50.0 + i,
                    "characters_typed": 100,
                }
            })
        # Get the profile
        response = client.get("/keystroke-profile/alice")
        data = response.json()
        assert len(data["profile"]["session_history"]) <= 50


# ===========================================================================
# GET /keystroke-profile/{student_id}
# ===========================================================================

class TestKeystrokeProfileEndpoint:
    """Tests for the keystroke profile retrieval endpoint."""

    def test_get_profile_new_student(self, client):
        """Getting profile for a new student should return defaults."""
        response = client.get("/keystroke-profile/new_student")
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == "new_student"
        assert data["profile"]["total_sessions"] == 0
        assert data["profile"]["average_wpm"] == 0

    def test_get_profile_after_submission(self, client):
        """Profile should reflect submitted metrics."""
        client.post("/keystroke-metrics", json={
            "student_id": "alice",
            "metrics": {
                "wpm": 45.0,
                "characters_typed": 100,
            }
        })
        response = client.get("/keystroke-profile/alice")
        assert response.status_code == 200
        data = response.json()
        assert data["profile"]["total_sessions"] == 1
        assert data["profile"]["average_wpm"] == 45.0


# ===========================================================================
# DELETE /keystroke-profile/{student_id}
# ===========================================================================

class TestKeystrokeProfileDeleteEndpoint:
    """Tests for the keystroke profile reset endpoint."""

    def test_reset_profile(self, client):
        """DELETE /keystroke-profile should reset the profile to defaults."""
        # First, submit some metrics
        client.post("/keystroke-metrics", json={
            "student_id": "alice",
            "metrics": {
                "wpm": 60.0,
                "characters_typed": 200,
            }
        })

        # Then reset
        response = client.delete("/keystroke-profile/alice")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

        # Verify reset
        profile_response = client.get("/keystroke-profile/alice")
        profile = profile_response.json()["profile"]
        assert profile["total_sessions"] == 0
        assert profile["average_wpm"] == 0

    def test_reset_profile_nonexistent_student(self, client):
        """Resetting profile for non-existent student should succeed."""
        response = client.delete("/keystroke-profile/ghost")
        assert response.status_code == 200
        assert response.json()["status"] == "success"


# ===========================================================================
# POST /subscribe
# ===========================================================================

class TestSubscribeEndpoint:
    """Tests for the waitlist subscription endpoint."""

    def test_subscribe_returns_success(self, client):
        """POST /subscribe should return success."""
        response = client.post("/subscribe", json={"email": "test@example.com"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "waitlist" in data["message"].lower()

    def test_subscribe_saves_email(self, client, mock_storage):
        """POST /subscribe should call storage.save_email."""
        client.post("/subscribe", json={"email": "alice@example.com"})
        mock_storage.save_email.assert_called_once()
        assert _mock_store["__emails__"] == ["alice@example.com"]


# ===========================================================================
# POST /query (API query endpoint)
# ===========================================================================

class TestQueryEndpoint:
    """Tests for the /query endpoint which returns chunked sections."""

    @patch("app.services.gemini_client.get_gemini_response", new_callable=AsyncMock)
    @patch("app.main.syllabus_service")
    def test_query_returns_sections(self, mock_syllabus, mock_gemini, client):
        """POST /query should return sections from Gemini."""
        mock_syllabus.get_relevant_context.return_value = ""
        mock_gemini.return_value = {
            "text": "Section 1\n\nSection 2",
            "sections": ["Section 1", "Section 2"],
            "source": "api",
        }

        response = client.post("/query", json={
            "student_id": "alice",
            "query": "What is calculus?",
        })
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert data["source"] == "api"
        assert len(data["sections"]) == 2

    @patch("app.services.gemini_client.get_gemini_response", new_callable=AsyncMock)
    def test_query_lockout_returns_lockout_sections(self, mock_gemini, client):
        """POST /query in LOCKOUT should return lockout message in sections."""
        ctx = StudentContext(student_id="tired")
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
        _mock_store["tired"] = ctx

        # Patch check_wellness to preserve the LOCKOUT state (avoid micro-decay)
        def _keep_lockout(context):
            context.fatigue_metric.status = FatigueStatus.LOCKOUT
            return context

        with patch("app.main.wellness_engine.check_wellness", side_effect=_keep_lockout):
            response = client.post("/query", json={
                "student_id": "tired",
                "query": "Another question",
            })
        data = response.json()
        assert "LOCKOUT" in data["sections"][0]
        mock_gemini.assert_not_called()
