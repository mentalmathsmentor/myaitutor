"""
Integration tests for the teach endpoint POST /api/chat/generate
(Teach Revamp Phase D).

Drives the real FastAPI router through TestClient. The database dependency is
overridden with a fake session and the generation engine is patched at its
service boundary, so these tests verify the router's contract: ownership
checks, the explicit parameter hand-off to the engine, error mapping
(400/404/422/502), and message + citation persistence.
"""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app
from app.models import (
    ExoskeletonResponse,
    ExoskeletonResponsePart,
    QuestionSetItem,
    ResponsePartTier,
    ResponsePartType,
)
from app.services import generation_engine
from app.services.generation_engine import (
    EmbeddingError,
    GenerationError,
    GenerationResult,
    UnsupportedIntentError,
)

TUTOR_ID = "00000000-0000-0000-0000-000000000000"
CLASS_ID = uuid4()
THREAD_ID = uuid4()

SAMPLE_RESPONSE = ExoskeletonResponse(
    parts=[
        ExoskeletonResponsePart(
            type=ResponsePartType.TEXT,
            tier=ResponsePartTier.ALL,
            content="Warm-up on index laws.",
        ),
        ExoskeletonResponsePart(
            type=ResponsePartType.QUESTION_SET,
            tier=ResponsePartTier.CORE,
            questions=[
                QuestionSetItem(
                    question_latex="Evaluate $2^{3} \\times 2^{2}$.",
                    teacher_answer_latex="$2^{5} = 32$",
                )
            ],
        ),
    ]
)

SAMPLE_CITATIONS = [
    {
        "id": str(uuid4()),
        "content_code": "MA4-IND-C-01",
        "subject": "Stage 4 Mathematics",
        "topic": "Indices",
        "source_document": "stage4_mathematics.docx",
        "distance": 0.22,
    }
]


class FakeResult:
    def __init__(self, scalar=None):
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar


class FakeSession:
    """Queue-driven AsyncSession stand-in for the router's DB access."""

    def __init__(self, results):
        self._results = list(results)
        self.added = []
        self.commits = 0

    async def execute(self, stmt, params=None):
        return self._results.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commits += 1

    async def flush(self):
        pass

    async def refresh(self, obj):
        pass


def make_class():
    return SimpleNamespace(
        id=CLASS_ID,
        tutor_id=TUTOR_ID,
        name="Year 8 Core",
        year_level=8,
        subject="Stage 4 Mathematics",
        ability_tier="Core",
        profile_metadata={},
    )


def make_thread():
    return SimpleNamespace(
        id=THREAD_ID,
        tutor_id=TUTOR_ID,
        class_id=CLASS_ID,
        title="Year 8 Core prep",
        created_at=None,
    )


@pytest.fixture
def fake_session():
    session = FakeSession([FakeResult(make_class()), FakeResult(make_thread())])

    async def _override():
        yield session

    app.dependency_overrides[get_db] = _override
    yield session
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    return TestClient(app)


def request_body(**overrides):
    body = {
        "class_id": str(CLASS_ID),
        "thread_id": str(THREAD_ID),
        "intent": "warmup",
        "topic": "Indices",
        "refinements": "keep it quick",
    }
    body.update(overrides)
    return body


def engine_mock(return_value=None, side_effect=None):
    return patch.object(
        generation_engine,
        "generate_teach_response",
        new=AsyncMock(return_value=return_value, side_effect=side_effect),
    )


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

class TestGenerateHappyPath:
    def test_returns_exoskeleton_parts(self, client, fake_session):
        result = GenerationResult(
            response=SAMPLE_RESPONSE, citations=SAMPLE_CITATIONS
        )
        with engine_mock(return_value=result):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 200
        data = response.json()
        assert len(data["parts"]) == 2
        assert data["parts"][0]["type"] == "text"
        assert data["parts"][1]["type"] == "question_set"
        assert (
            data["parts"][1]["questions"][0]["question_latex"]
            == "Evaluate $2^{3} \\times 2^{2}$."
        )

    def test_engine_receives_explicit_parameters(self, client, fake_session):
        result = GenerationResult(response=SAMPLE_RESPONSE, citations=[])
        with engine_mock(return_value=result) as mocked:
            client.post("/api/chat/generate", json=request_body())

        mocked.assert_awaited_once()
        args, kwargs = mocked.await_args
        assert args == (fake_session,)
        assert kwargs == {
            "intent": "warmup",
            "topic": "Indices",
            "subject": "Stage 4 Mathematics",
            "year_level": 8,
            "ability_tier": "Core",
            "refinements": "keep it quick",
        }

    def test_persists_user_and_assistant_messages_with_citations(
        self, client, fake_session
    ):
        result = GenerationResult(
            response=SAMPLE_RESPONSE, citations=SAMPLE_CITATIONS
        )
        with engine_mock(return_value=result):
            client.post("/api/chat/generate", json=request_body())

        assert len(fake_session.added) == 2
        assert fake_session.commits == 1

        user_msg, assistant_msg = fake_session.added
        assert user_msg.role == "user"
        assert user_msg.retrieval_citations == []
        user_payload = json.loads(user_msg.content)
        assert user_payload == {
            "intent": "warmup",
            "topic": "Indices",
            "refinements": "keep it quick",
        }

        assert assistant_msg.role == "assistant"
        assert assistant_msg.retrieval_citations == SAMPLE_CITATIONS
        assert (
            ExoskeletonResponse.model_validate_json(assistant_msg.content)
            == SAMPLE_RESPONSE
        )


# ---------------------------------------------------------------------------
# Error paths
# ---------------------------------------------------------------------------

class TestGenerateErrorPaths:
    def test_unknown_class_returns_404(self, client):
        session = FakeSession([FakeResult(None)])

        async def _override():
            yield session

        app.dependency_overrides[get_db] = _override
        try:
            with engine_mock() as mocked:
                response = client.post("/api/chat/generate", json=request_body())
        finally:
            app.dependency_overrides.pop(get_db, None)

        assert response.status_code == 404
        assert response.json()["detail"] == "Class not found"
        mocked.assert_not_awaited()

    def test_unknown_thread_returns_404(self, client):
        session = FakeSession([FakeResult(make_class()), FakeResult(None)])

        async def _override():
            yield session

        app.dependency_overrides[get_db] = _override
        try:
            with engine_mock() as mocked:
                response = client.post("/api/chat/generate", json=request_body())
        finally:
            app.dependency_overrides.pop(get_db, None)

        assert response.status_code == 404
        assert response.json()["detail"] == "Thread not found for class"
        mocked.assert_not_awaited()

    def test_generation_failure_returns_502_and_persists_nothing(
        self, client, fake_session
    ):
        with engine_mock(
            side_effect=GenerationError("Gemini generation failed: 503 overloaded")
        ):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 502
        assert "Gemini generation failed" in response.json()["detail"]
        assert fake_session.added == []
        assert fake_session.commits == 0

    def test_embedding_failure_returns_502(self, client, fake_session):
        with engine_mock(
            side_effect=EmbeddingError("Query embedding failed: quota exhausted")
        ):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 502
        assert "Query embedding failed" in response.json()["detail"]

    def test_unsupported_intent_from_engine_returns_400(self, client, fake_session):
        with engine_mock(side_effect=UnsupportedIntentError("warmup")):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 400
        assert "Unsupported intent" in response.json()["detail"]

    def test_invalid_intent_rejected_by_validation_422(self, client, fake_session):
        response = client.post(
            "/api/chat/generate", json=request_body(intent="interpretive_dance")
        )
        assert response.status_code == 422

    def test_missing_topic_rejected_by_validation_422(self, client, fake_session):
        body = request_body()
        del body["topic"]
        response = client.post("/api/chat/generate", json=body)
        assert response.status_code == 422

    def test_empty_topic_rejected_by_validation_422(self, client, fake_session):
        response = client.post("/api/chat/generate", json=request_body(topic=""))
        assert response.status_code == 422
