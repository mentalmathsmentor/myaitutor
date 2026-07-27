"""Instrumentation-integrity tests (Darra fix #1).

`sessions.questions_generated` must count DECK ITEMS, never generate calls —
otherwise the dogfood generated-vs-kept ratio is meaningless. Runs the real
/api/chat/generate route in echo mode (multi-part stub deck: 2 core + 1
extension = 3 items) against the DATABASE_URL Postgres; skipped when no
database is configured.
"""

import os
import sys
import types
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="requires DATABASE_URL (Postgres with migrations applied)",
)

os.environ["MAIT_PROMPT_ECHO"] = "1"
os.environ.setdefault("GEMINI_API_KEY", "unused-in-echo-mode")

if "faiss" not in sys.modules:  # legacy student path only; tutor path never uses it
    faiss_stub = types.ModuleType("faiss")
    faiss_stub.IndexFlatIP = lambda *a, **k: None
    faiss_stub.read_index = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("stubbed"))
    sys.modules["faiss"] = faiss_stub

ECHO_DECK_ITEM_COUNT = 3  # pinned to the stub in routers/chat.py


@pytest.fixture(autouse=True)
async def _fresh_engine_pool():
    """Each anyio test runs its own event loop; abandon (don't close) pooled
    asyncpg connections bound to a previous test's loop."""
    from app.db.session import engine

    await engine.dispose(close=False)
    yield


@pytest.mark.anyio
async def test_questions_generated_counts_deck_items_not_calls():
    import httpx

    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        student_resp = await client.post(
            "/api/students/init",
            json={
                "name": f"S{uuid.uuid4().int % 100000}",
                "subject": "Stage 5 Mathematics",
                "year_level": 9,
                "profile": {"ability_tier": "Core"},
            },
        )
        assert student_resp.status_code == 200, student_resp.text
        student_id = student_resp.json()["student"]["id"]

        async def generate():
            resp = await client.post(
                "/api/chat/generate",
                json={
                    "student_id": student_id,
                    "intent": "practice_set",
                    "topic": "Trigonometry",
                },
            )
            assert resp.status_code == 200, resp.text
            return resp.json()

        first = await generate()
        session_id = first["session_id"]
        assert len(first["question_ids"]) == ECHO_DECK_ITEM_COUNT

        session_resp = await client.get(f"/api/sessions/{session_id}")
        assert session_resp.status_code == 200
        session = session_resp.json()["session"]
        assert session["questions_generated"] == ECHO_DECK_ITEM_COUNT, (
            "questions_generated must count deck items, not generate calls"
        )

        # Second call accumulates by item count again (not +1).
        second = await generate()
        assert second["session_id"] == session_id
        session = (await client.get(f"/api/sessions/{session_id}")).json()["session"]
        assert session["questions_generated"] == 2 * ECHO_DECK_ITEM_COUNT


@pytest.mark.anyio
async def test_deck_export_logs_event_and_returns_elements():
    import httpx

    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        student_resp = await client.post(
            "/api/students/init",
            json={
                "name": f"S{uuid.uuid4().int % 100000}",
                "subject": "Stage 5 Mathematics",
                "year_level": 9,
                "profile": {},
            },
        )
        student_id = student_resp.json()["student"]["id"]
        gen = await client.post(
            "/api/chat/generate",
            json={"student_id": student_id, "intent": "practice_set", "topic": "Indices"},
        )
        session_id = gen.json()["session_id"]

        export = await client.post(f"/api/sessions/{session_id}/deck-export")
        assert export.status_code == 200, export.text
        data = export.json()
        assert data["question_count"] == ECHO_DECK_ITEM_COUNT
        kinds = [element["kind"] for element in data["elements"]]
        assert kinds[0] == "preamble" and kinds[-1] == "footer"
        assert kinds.count("question") == ECHO_DECK_ITEM_COUNT
        assembled = "\n\n".join(element["content_latex"] for element in data["elements"])
        assert assembled.count("\\item") >= ECHO_DECK_ITEM_COUNT
        assert "\\end{document}" in assembled

        session = (await client.get(f"/api/sessions/{session_id}")).json()["session"]
        assert session["deck"]["exported_to_canvas"]["question_count"] == ECHO_DECK_ITEM_COUNT
