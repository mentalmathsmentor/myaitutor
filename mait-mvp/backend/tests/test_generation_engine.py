"""
Integration tests for app/services/generation_engine.py (Teach Revamp Phase D).

Covers the full engine pipeline — embed -> retrieve -> prompt -> Gemini native
structured output -> validated ExoskeletonResponse — on BOTH happy and error
paths. The Gemini SDK and the database session are faked; no network, no DB.
"""
import sys
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models import (
    ExoskeletonResponse,
    ExoskeletonResponsePart,
    QuestionSetItem,
    ResponsePartTier,
    ResponsePartType,
)
from app.services import generation_engine
from app.services.generation_engine import (
    EMPTY_RETRIEVAL_NOTICE,
    EmbeddingError,
    GenerationError,
    GenerationResult,
    UnsupportedIntentError,
    build_citations,
    build_prompt,
    embed_query,
    format_rag_chunks,
    generate_structured_response,
    generate_teach_response,
)
from app.services.prompts import SYSTEM_INSTRUCTION_CORE


# ---------------------------------------------------------------------------
# Fakes and helpers
# ---------------------------------------------------------------------------

SAMPLE_RESPONSE = ExoskeletonResponse(
    parts=[
        ExoskeletonResponsePart(
            type=ResponsePartType.TEXT,
            tier=ResponsePartTier.ALL,
            content="Objective: simplify expressions using index laws.",
        ),
        ExoskeletonResponsePart(
            type=ResponsePartType.QUESTION_SET,
            tier=ResponsePartTier.CORE,
            questions=[
                QuestionSetItem(
                    question_latex="Simplify $x^{2} \\times x^{3}$.",
                    teacher_answer_latex="$x^{2} \\times x^{3} = x^{5}$",
                    marks=1,
                )
            ],
        ),
    ]
)


def make_rows():
    return [
        {
            "id": uuid4(),
            "content": "Index laws: multiply powers with the same base by adding indices.",
            "content_code": "MA4-IND-C-01",
            "subject": "Stage 4 Mathematics",
            "source_document": "stage4_mathematics.docx",
            "metadata_json": {"topic": "Indices"},
            "distance": 0.21,
        },
        {
            "id": uuid4(),
            "content": "Zero index: any non-zero base raised to the power of zero is one.",
            "content_code": "MA4-IND-C-02",
            "subject": "Stage 4 Mathematics",
            "source_document": "stage4_mathematics.docx",
            "metadata_json": {"topic": "Indices"},
            "distance": 0.27,
        },
    ]


class FakeRetrievalSession:
    """Minimal AsyncSession stand-in for the retrieval query."""

    def __init__(self, rows):
        self._rows = rows
        self.calls = []

    async def execute(self, stmt, params=None):
        self.calls.append((stmt, params))
        mappings = MagicMock()
        mappings.all.return_value = self._rows
        result = MagicMock()
        result.mappings.return_value = mappings
        return result


@contextmanager
def fresh_gemini(generate_return=None, generate_side_effect=None):
    """Install a per-test google.genai mock and a fake engine client.

    Returns (genai_module_mock, fake_client) so tests can assert on the
    GenerateContentConfig kwargs and the generate_content call.
    """
    genai_mod = MagicMock()
    types_mod = genai_mod.types
    fake_client = MagicMock()
    fake_client.aio.models.generate_content = AsyncMock(
        return_value=generate_return, side_effect=generate_side_effect
    )
    with patch.dict(
        sys.modules,
        {"google.genai": genai_mod, "google.genai.types": types_mod},
    ), patch.object(generation_engine, "get_client", return_value=fake_client):
        yield genai_mod, fake_client


def gemini_response(parsed=None, text=None):
    return SimpleNamespace(parsed=parsed, text=text)


# ---------------------------------------------------------------------------
# Happy path: full pipeline
# ---------------------------------------------------------------------------

class TestGenerateTeachResponseHappyPath:
    @pytest.mark.asyncio
    async def test_full_pipeline_returns_result_with_citations(self):
        rows = make_rows()
        db = FakeRetrievalSession(rows)

        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (genai_mod, client):
            with patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.1] * 768),
            ) as embed_mock:
                result = await generate_teach_response(
                    db,
                    intent="practice_set",
                    topic="Indices",
                    subject="Stage 4 Mathematics",
                    year_level=8,
                    ability_tier="Core",
                    refinements="focus on negative indices",
                )

        assert isinstance(result, GenerationResult)
        assert result.response is SAMPLE_RESPONSE

        # Refinements (free text) drive the embedding query, per Canon §4.
        embed_mock.assert_awaited_once_with("focus on negative indices")

        # Retrieval used the locked subject + exact-topic filter.
        _, params = db.calls[0]
        assert params["subject"] == "Stage 4 Mathematics"
        assert params["topic"] == "Indices"
        assert params["query_embedding"].startswith("[0.1,")

        # Citations mirror the retrieved rows.
        assert len(result.citations) == 2
        assert result.citations[0]["content_code"] == "MA4-IND-C-01"
        assert result.citations[0]["topic"] == "Indices"
        assert result.citations[0]["distance"] == pytest.approx(0.21)
        assert result.citations[0]["id"] == str(rows[0]["id"])

        # The prompt carries the chunks; the system instruction does NOT
        # ride in the user turn any more (it is native config now).
        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert "Index laws" in contents
        assert "focus on negative indices" not in contents  # practice_set has no {refinements}
        assert SYSTEM_INSTRUCTION_CORE not in contents

    @pytest.mark.asyncio
    async def test_native_structured_output_config(self):
        """Phase C: system_instruction + response_schema wired natively."""
        db = FakeRetrievalSession(make_rows())

        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (genai_mod, client):
            with patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.0] * 768),
            ):
                await generate_teach_response(
                    db,
                    intent="warmup",
                    topic="Indices",
                    subject="Stage 4 Mathematics",
                    year_level=8,
                    ability_tier="Core",
                    refinements=None,
                )

        config_kwargs = genai_mod.types.GenerateContentConfig.call_args.kwargs
        assert config_kwargs["system_instruction"] == SYSTEM_INSTRUCTION_CORE
        assert config_kwargs["response_mime_type"] == "application/json"
        assert config_kwargs["response_schema"] is ExoskeletonResponse
        assert config_kwargs["temperature"] == 0.4
        assert config_kwargs["max_output_tokens"] == 8000

        call_kwargs = client.aio.models.generate_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-3.5-flash"

    @pytest.mark.asyncio
    async def test_topic_is_embedding_fallback_when_no_refinements(self):
        db = FakeRetrievalSession(make_rows())

        with fresh_gemini(generate_return=gemini_response(parsed=SAMPLE_RESPONSE)):
            with patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.0] * 768),
            ) as embed_mock:
                await generate_teach_response(
                    db,
                    intent="challenge",
                    topic="Indices",
                    subject="Stage 4 Mathematics",
                    year_level=8,
                    ability_tier="Core",
                    refinements="   ",
                )

        embed_mock.assert_awaited_once_with("Indices")

    @pytest.mark.asyncio
    async def test_empty_retrieval_uses_notice_and_empty_citations(self):
        db = FakeRetrievalSession([])

        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            with patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.0] * 768),
            ):
                result = await generate_teach_response(
                    db,
                    intent="lesson_plan",
                    topic="Quaternions",
                    subject="Stage 4 Mathematics",
                    year_level=8,
                    ability_tier="Core",
                    refinements=None,
                )

        assert result.citations == []
        assert result.rag_chunks == EMPTY_RETRIEVAL_NOTICE
        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert EMPTY_RETRIEVAL_NOTICE in contents


# ---------------------------------------------------------------------------
# Error paths
# ---------------------------------------------------------------------------

class TestGenerateTeachResponseErrorPaths:
    @pytest.mark.asyncio
    async def test_unsupported_intent_raises_before_generation(self):
        db = FakeRetrievalSession(make_rows())

        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            with patch.object(
                generation_engine,
                "embed_query",
                new=AsyncMock(return_value=[0.0] * 768),
            ):
                with pytest.raises(UnsupportedIntentError) as exc_info:
                    await generate_teach_response(
                        db,
                        intent="interpretive_dance",
                        topic="Indices",
                        subject="Stage 4 Mathematics",
                        year_level=8,
                        ability_tier="Core",
                        refinements=None,
                    )

        assert "interpretive_dance" in str(exc_info.value)
        client.aio.models.generate_content.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_embedding_failure_raises_embedding_error(self):
        failing_client = MagicMock()
        failing_client.models.embed_content.side_effect = RuntimeError("quota exhausted")

        genai_mod = MagicMock()
        with patch.dict(
            sys.modules,
            {"google.genai": genai_mod, "google.genai.types": genai_mod.types},
        ), patch.object(generation_engine, "get_client", return_value=failing_client):
            with pytest.raises(EmbeddingError) as exc_info:
                await embed_query("Indices")

        assert "quota exhausted" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_gemini_sdk_failure_raises_generation_error(self):
        with fresh_gemini(generate_side_effect=RuntimeError("503 model overloaded")):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")

        assert "503 model overloaded" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_gemini_timeout_raises_generation_error(self):
        import asyncio

        with fresh_gemini(generate_side_effect=asyncio.TimeoutError()):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")

        assert "timed out" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_malformed_json_body_raises_generation_error(self):
        with fresh_gemini(
            generate_return=gemini_response(parsed=None, text="not json at all")
        ):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")

        assert "invalid ExoskeletonResponse" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_empty_response_body_raises_generation_error(self):
        with fresh_gemini(generate_return=gemini_response(parsed=None, text=None)):
            with pytest.raises(GenerationError):
                await generate_structured_response("prompt")

    @pytest.mark.asyncio
    async def test_schema_violating_parsed_payload_raises_generation_error(self):
        # 'parts' items missing the required 'type'/'tier' fields.
        with fresh_gemini(
            generate_return=gemini_response(parsed={"parts": [{"bogus": True}]})
        ):
            with pytest.raises(GenerationError):
                await generate_structured_response("prompt")


# ---------------------------------------------------------------------------
# Structured-output parsing fallbacks (native contract, Phase C)
# ---------------------------------------------------------------------------

class TestStructuredOutputParsing:
    @pytest.mark.asyncio
    async def test_typed_parsed_payload_is_returned_directly(self):
        with fresh_gemini(generate_return=gemini_response(parsed=SAMPLE_RESPONSE)):
            response = await generate_structured_response("prompt")
        assert response is SAMPLE_RESPONSE

    @pytest.mark.asyncio
    async def test_dict_parsed_payload_is_validated(self):
        payload = SAMPLE_RESPONSE.model_dump(mode="json")
        with fresh_gemini(generate_return=gemini_response(parsed=payload)):
            response = await generate_structured_response("prompt")
        assert isinstance(response, ExoskeletonResponse)
        assert response == SAMPLE_RESPONSE

    @pytest.mark.asyncio
    async def test_raw_text_fallback_is_validated(self):
        raw = SAMPLE_RESPONSE.model_dump_json()
        with fresh_gemini(generate_return=gemini_response(parsed=None, text=raw)):
            response = await generate_structured_response("prompt")
        assert isinstance(response, ExoskeletonResponse)
        assert response == SAMPLE_RESPONSE


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

class TestHelpers:
    def test_build_citations_handles_null_metadata_and_distance(self):
        row_id = uuid4()
        rows = [
            {
                "id": row_id,
                "content": "x",
                "content_code": None,
                "subject": "Stage 5 Mathematics",
                "source_document": None,
                "metadata_json": None,
                "distance": None,
            }
        ]
        citations = build_citations(rows)
        assert citations == [
            {
                "id": str(row_id),
                "content_code": None,
                "subject": "Stage 5 Mathematics",
                "topic": None,
                "source_document": None,
                "distance": None,
            }
        ]

    def test_format_rag_chunks_empty_returns_notice(self):
        assert format_rag_chunks([]) == EMPTY_RETRIEVAL_NOTICE

    def test_format_rag_chunks_numbers_chunks(self):
        formatted = format_rag_chunks(make_rows())
        assert "[Chunk 1]" in formatted
        assert "[Chunk 2]" in formatted
        assert "Index laws" in formatted

    def test_build_prompt_formats_all_placeholders(self):
        prompt = build_prompt(
            intent="chat",
            rag_chunks="CHUNKS_HERE",
            year_level=11,
            subject="Mathematics Advanced",
            ability_tier="Band 5/6",
            refinements="three questions on the product rule",
        )
        assert "CHUNKS_HERE" in prompt
        assert "Year 11" in prompt
        assert "Mathematics Advanced" in prompt
        assert "Band 5/6" in prompt
        assert "three questions on the product rule" in prompt

    def test_build_prompt_unknown_intent_raises(self):
        with pytest.raises(UnsupportedIntentError):
            build_prompt(
                intent="nope",
                rag_chunks="",
                year_level=7,
                subject="Stage 4 Mathematics",
                ability_tier="Core",
                refinements="",
            )
