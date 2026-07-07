"""
Integration tests for the teach endpoint POST /api/chat/generate.

Drives the real FastAPI router through TestClient. The database dependency is
overridden with a fake session, retrieval helpers and the generation engine
are patched at the service boundary, so these tests verify the router's
contract: ownership checks, retrieval orchestration (directive §2: the ROUTER
owns retrieval and hands the engine pre-formatted rag_chunks), the explicit
canonical-parameter hand-off, error mapping (400/404/422/502), and
message + citation persistence.
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
    TutorIntent,
    UnsupportedIntentError,
)

TUTOR_ID = "00000000-0000-0000-0000-000000000000"
CLASS_ID = uuid4()
THREAD_ID = uuid4()
CHUNK_ID = uuid4()

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

SAMPLE_ROWS = [
    {
        "id": CHUNK_ID,
        "content": "Index laws: multiply powers with the same base by adding indices.",
        "content_code": "MA4-IND-C-01",
        "subject": "Stage 4 Mathematics",
        "source_document": "stage4_mathematics.docx",
        "metadata_json": {"topic": "Indices"},
        "distance": 0.22,
    }
]

EXPECTED_CITATIONS = generation_engine.build_citations(SAMPLE_ROWS)
EXPECTED_RAG_CHUNKS = generation_engine.format_rag_chunks(SAMPLE_ROWS)


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


class patched_pipeline:
    """Patch embed_query, retrieve_chunks, and generate_teach_response.

    build_citations / format_rag_chunks run for real so persistence
    assertions cover the true citation shape.
    """

    def __init__(self, rows=SAMPLE_ROWS, fallback_rows=(), engine_return=SAMPLE_RESPONSE,
                 embed_side_effect=None, engine_side_effect=None):
        self._patches = [
            patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.1] * 768, side_effect=embed_side_effect),
            ),
            patch.object(
                generation_engine,
                "retrieve_chunks",
                new=AsyncMock(return_value=rows),
            ),
            patch.object(
                generation_engine,
                "retrieve_chunks_subject_only",
                new=AsyncMock(return_value=list(fallback_rows)),
            ),
            patch.object(
                generation_engine,
                "generate_teach_response",
                new=AsyncMock(return_value=engine_return, side_effect=engine_side_effect),
            ),
        ]

    def __enter__(self):
        mocks = [p.__enter__() for p in self._patches]
        return SimpleNamespace(
            embed_query=mocks[0],
            retrieve_chunks=mocks[1],
            retrieve_subject_only=mocks[2],
            engine=mocks[3],
        )

    def __exit__(self, *exc):
        for p in reversed(self._patches):
            p.__exit__(*exc)
        return False


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

class TestGenerateHappyPath:
    def test_returns_exoskeleton_parts(self, client, fake_session):
        with patched_pipeline():
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

    def test_router_owns_retrieval_and_engine_gets_canonical_params(
        self, client, fake_session
    ):
        with patched_pipeline() as mocks:
            client.post("/api/chat/generate", json=request_body())

        # Refinements drive the embedding; retrieval uses the locked filter.
        mocks.embed_query.assert_awaited_once_with("keep it quick")
        mocks.retrieve_chunks.assert_awaited_once_with(
            fake_session,
            subject="Stage 4 Mathematics",
            topic="Indices",
            query_embedding=[0.1] * 768,
        )
        # Exact match returned rows -> no subject-wide fallback.
        mocks.retrieve_subject_only.assert_not_awaited()

        # The engine receives exactly the directive §2 canonical params —
        # no db handle, pre-formatted rag_chunks, empty student_context.
        mocks.engine.assert_awaited_once()
        args, kwargs = mocks.engine.await_args
        assert args == ()
        assert kwargs == {
            "intent": TutorIntent.WARMUP,
            "topic": "Indices",
            "year_level": 8,
            "subject": "Stage 4 Mathematics",
            "ability_tier": "Core",
            "refinements": "keep it quick",
            "rag_chunks": EXPECTED_RAG_CHUNKS,
            "student_context": "",
        }

    def test_topic_is_embedding_fallback_without_refinements(
        self, client, fake_session
    ):
        with patched_pipeline() as mocks:
            client.post(
                "/api/chat/generate", json=request_body(refinements=None)
            )

        mocks.embed_query.assert_awaited_once_with("Indices")

    def test_persists_user_and_assistant_messages_with_citations(
        self, client, fake_session
    ):
        with patched_pipeline():
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
        assert assistant_msg.retrieval_citations == EXPECTED_CITATIONS
        assert (
            ExoskeletonResponse.model_validate_json(assistant_msg.content)
            == SAMPLE_RESPONSE
        )


# ---------------------------------------------------------------------------
# §4 subject-only retrieval fallback (ratified 07/07/2026)
# ---------------------------------------------------------------------------

class TestSubjectFallback:
    def test_topicless_query_uses_subject_wide_retrieval(self, client, fake_session):
        body = request_body(refinements="something fun to finish the lesson")
        del body["topic"]

        with patched_pipeline(fallback_rows=SAMPLE_ROWS) as mocks:
            response = client.post("/api/chat/generate", json=body)

        assert response.status_code == 200
        mocks.retrieve_chunks.assert_not_awaited()  # no topic -> no exact filter
        mocks.retrieve_subject_only.assert_awaited_once_with(
            fake_session,
            subject="Stage 4 Mathematics",
            query_embedding=[0.1] * 768,
        )
        # Engine stays grounded on the fallback rows; topic rides as "".
        kwargs = mocks.engine.await_args.kwargs
        assert kwargs["topic"] == ""
        assert kwargs["rag_chunks"] == EXPECTED_RAG_CHUNKS

        # Persistence still records the fallback citations.
        _, assistant_msg = fake_session.added
        assert assistant_msg.retrieval_citations == EXPECTED_CITATIONS

    def test_zero_exact_matches_fall_back_to_subject_search(
        self, client, fake_session
    ):
        with patched_pipeline(rows=[], fallback_rows=SAMPLE_ROWS) as mocks:
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 200
        mocks.retrieve_chunks.assert_awaited_once()
        mocks.retrieve_subject_only.assert_awaited_once()
        assert mocks.engine.await_args.kwargs["rag_chunks"] == EXPECTED_RAG_CHUNKS

    def test_fallback_with_zero_rows_still_grounds_via_notice(
        self, client, fake_session
    ):
        with patched_pipeline(rows=[], fallback_rows=[]) as mocks:
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 200
        assert (
            mocks.engine.await_args.kwargs["rag_chunks"]
            == generation_engine.EMPTY_RETRIEVAL_NOTICE
        )

    def test_no_topic_and_no_refinements_returns_400(self, client, fake_session):
        body = request_body(refinements=None)
        del body["topic"]

        with patched_pipeline() as mocks:
            response = client.post("/api/chat/generate", json=body)

        assert response.status_code == 400
        assert "topic or refinements" in response.json()["detail"]
        mocks.embed_query.assert_not_awaited()


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
            with patched_pipeline() as mocks:
                response = client.post("/api/chat/generate", json=request_body())
        finally:
            app.dependency_overrides.pop(get_db, None)

        assert response.status_code == 404
        assert response.json()["detail"] == "Class not found"
        mocks.embed_query.assert_not_awaited()
        mocks.engine.assert_not_awaited()

    def test_unknown_thread_returns_404(self, client):
        session = FakeSession([FakeResult(make_class()), FakeResult(None)])

        async def _override():
            yield session

        app.dependency_overrides[get_db] = _override
        try:
            with patched_pipeline() as mocks:
                response = client.post("/api/chat/generate", json=request_body())
        finally:
            app.dependency_overrides.pop(get_db, None)

        assert response.status_code == 404
        assert response.json()["detail"] == "Thread not found for class"
        mocks.engine.assert_not_awaited()

    def test_generation_failure_returns_502_and_persists_nothing(
        self, client, fake_session
    ):
        with patched_pipeline(
            engine_side_effect=GenerationError(
                "Gemini generation failed: 503 overloaded"
            )
        ):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 502
        assert "Gemini generation failed" in response.json()["detail"]
        assert fake_session.added == []
        assert fake_session.commits == 0

    def test_embedding_failure_returns_502(self, client, fake_session):
        with patched_pipeline(
            embed_side_effect=EmbeddingError(
                "Query embedding failed: quota exhausted"
            )
        ) as mocks:
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 502
        assert "Query embedding failed" in response.json()["detail"]
        mocks.engine.assert_not_awaited()

    def test_unsupported_intent_from_engine_returns_400(self, client, fake_session):
        with patched_pipeline(
            engine_side_effect=UnsupportedIntentError("warmup")
        ):
            response = client.post("/api/chat/generate", json=request_body())

        assert response.status_code == 400
        assert "Unsupported intent" in response.json()["detail"]

    def test_invalid_intent_rejected_by_validation_422(self, client, fake_session):
        response = client.post(
            "/api/chat/generate", json=request_body(intent="interpretive_dance")
        )
        assert response.status_code == 422

    def test_missing_topic_allowed_since_fallback_ratification(
        self, client, fake_session
    ):
        # Pre-ratification this was a 422; the §4 ruling (07/07/2026) makes a
        # topic-less request valid when refinements ground the query.
        body = request_body()
        del body["topic"]
        with patched_pipeline(fallback_rows=SAMPLE_ROWS):
            response = client.post("/api/chat/generate", json=body)
        assert response.status_code == 200

    def test_empty_topic_rejected_by_validation_422(self, client, fake_session):
        response = client.post("/api/chat/generate", json=request_body(topic=""))
        assert response.status_code == 422
