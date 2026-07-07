"""
Tests for app/services/generation_engine.py, built to the Phase C checklist
in Fable_Teach_Revamp_Prompt.md (v3) — items 1-10 are covered explicitly and
labelled, plus engine error paths and the router-side retrieval toolkit.

The Gemini SDK and the database session are faked; no network, no DB.
"""
import asyncio
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
    STUDENT_CONTEXT_HEADER,
    EmbeddingError,
    GenerationError,
    TutorIntent,
    UnsupportedIntentError,
    build_citations,
    build_prompt,
    embed_query,
    format_rag_chunks,
    generate_structured_response,
    generate_teach_response,
)
from app.services.prompts import INTENT_TEMPLATES, SYSTEM_INSTRUCTION_CORE


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

SAMPLE_RAG_CHUNKS = (
    "[Chunk 1] content_code=MA4-IND-C-01 topic=Indices source=stage4_mathematics.docx\n"
    "Index laws: multiply powers with the same base by adding indices."
)

ENGINE_KWARGS = dict(
    intent=TutorIntent.PRACTICE_SET,
    topic="Indices",
    year_level=8,
    subject="Stage 4 Mathematics",
    ability_tier="Core",
    refinements="focus on negative indices",
    rag_chunks=SAMPLE_RAG_CHUNKS,
)

PROMPT_KWARGS = dict(
    intent="practice_set",
    rag_chunks=SAMPLE_RAG_CHUNKS,
    year_level=8,
    subject="Stage 4 Mathematics",
    ability_tier="Core",
    refinements="",
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
# Phase C checklist (Fable_Teach_Revamp_Prompt.md v3) — items 1-10
# ---------------------------------------------------------------------------

class TestPhaseCChecklist:
    @pytest.mark.asyncio
    async def test_01_schema_valid_parts_round_trip(self):
        """C1: schema-valid ExoskeletonResponse parts round-trip correctly."""
        with fresh_gemini(generate_return=gemini_response(parsed=SAMPLE_RESPONSE)):
            response = await generate_teach_response(**ENGINE_KWARGS)

        assert response is SAMPLE_RESPONSE
        round_tripped = ExoskeletonResponse.model_validate_json(
            response.model_dump_json()
        )
        assert round_tripped == SAMPLE_RESPONSE
        assert round_tripped.parts[1].questions[0].teacher_answer_latex is not None

    def test_02_no_forced_marks_in_template_output(self):
        """C2: no forced [N Marks] / \\hfill in any built prompt."""
        for intent in TutorIntent:
            prompt = build_prompt(**{**PROMPT_KWARGS, "intent": intent.value})
            assert "[N Marks]" not in prompt
            assert "\\hfill" not in prompt
        assert "[N Marks]" not in SYSTEM_INSTRUCTION_CORE

    def test_03_empty_student_context_produces_clean_prompt(self):
        """C3: empty student_context -> no block, no filler text."""
        base = build_prompt(**PROMPT_KWARGS)
        for empty in ("", "   \n  "):
            prompt = build_prompt(**PROMPT_KWARGS, student_context=empty)
            assert prompt == base
            assert STUDENT_CONTEXT_HEADER not in prompt
            assert "No student context" not in prompt

    def test_04_non_empty_student_context_injected_after_template(self):
        """C4: non-empty student_context appends the block verbatim, at the end."""
        profile = (
            "Last session (2026-07-01): Indices.\n"
            "Nailed: index laws. Struggled: negative indices.\n"
            "Active vault: sign errors under time pressure."
        )
        prompt = build_prompt(**PROMPT_KWARGS, student_context=profile)
        template_only = build_prompt(**PROMPT_KWARGS)
        assert prompt == f"{template_only}\n\n{STUDENT_CONTEXT_HEADER}\n{profile}"

    def test_05_list_environment_ban_holds_in_system_instruction(self):
        """C5: the system instruction bans LaTeX list environments."""
        assert "NEVER use LaTeX environments" in SYSTEM_INSTRUCTION_CORE
        assert "\\begin{enumerate}" in SYSTEM_INSTRUCTION_CORE  # named in the ban
        assert "\\begin{itemize}" in SYSTEM_INSTRUCTION_CORE
        # And no template smuggles a list environment in as actual formatting.
        for intent, template in INTENT_TEMPLATES.items():
            assert "\\begin{enumerate}" not in template, intent
            assert "\\begin{itemize}" not in template, intent

    @pytest.mark.asyncio
    async def test_06_max_output_tokens_8000_configured(self):
        """C6: max_output_tokens=8000 is set on the Gemini config."""
        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (genai_mod, _):
            await generate_teach_response(**ENGINE_KWARGS)

        config_kwargs = genai_mod.types.GenerateContentConfig.call_args.kwargs
        assert config_kwargs["max_output_tokens"] == 8000

    @pytest.mark.asyncio
    async def test_07_rag_chunks_pass_through_unmodified(self):
        """C7: the rag_chunks string reaches the prompt verbatim."""
        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            await generate_teach_response(**ENGINE_KWARGS)

        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert SAMPLE_RAG_CHUNKS in contents

    @pytest.mark.asyncio
    async def test_08_invalid_gemini_json_raises_clear_error(self):
        """C8: invalid JSON on the model_validate_json fallback path."""
        with fresh_gemini(
            generate_return=gemini_response(parsed=None, text="not json at all")
        ):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")

        assert "invalid ExoskeletonResponse" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_09_empty_rag_chunks_produces_clean_fallback_prompt(self):
        """C9: zero retrieval results -> 'No exact topic chunks' message."""
        assert format_rag_chunks([]) == EMPTY_RETRIEVAL_NOTICE  # router-side

        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            await generate_teach_response(**{**ENGINE_KWARGS, "rag_chunks": ""})

        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert EMPTY_RETRIEVAL_NOTICE in contents  # engine-side defence

    @pytest.mark.asyncio
    async def test_10_sixty_second_timeout_configured(self):
        """C10: the 60s Gemini call timeout is configured and enforced."""
        assert generation_engine.GENERATION_TIMEOUT_SECONDS == 60.0

        with fresh_gemini(generate_side_effect=asyncio.TimeoutError()):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")
        assert "timed out after 60s" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Canonical interface & native structured output
# ---------------------------------------------------------------------------

class TestEngineInterface:
    @pytest.mark.asyncio
    async def test_native_structured_output_config(self):
        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (genai_mod, client):
            await generate_teach_response(**ENGINE_KWARGS)

        config_kwargs = genai_mod.types.GenerateContentConfig.call_args.kwargs
        assert config_kwargs["system_instruction"] == SYSTEM_INSTRUCTION_CORE
        assert config_kwargs["response_mime_type"] == "application/json"
        assert config_kwargs["response_schema"] is ExoskeletonResponse
        assert config_kwargs["temperature"] == 0.4

        call_kwargs = client.aio.models.generate_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-3.5-flash"
        # System instruction is native config, not concatenated user turn.
        assert SYSTEM_INSTRUCTION_CORE not in call_kwargs["contents"]

    @pytest.mark.asyncio
    async def test_intent_accepts_enum_and_string(self):
        for intent in (TutorIntent.WARMUP, "warmup"):
            with fresh_gemini(
                generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
            ):
                response = await generate_teach_response(
                    **{**ENGINE_KWARGS, "intent": intent}
                )
            assert response is SAMPLE_RESPONSE

    @pytest.mark.asyncio
    async def test_unsupported_intent_raises_before_generation(self):
        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            with pytest.raises(UnsupportedIntentError) as exc_info:
                await generate_teach_response(
                    **{**ENGINE_KWARGS, "intent": "interpretive_dance"}
                )

        assert "interpretive_dance" in str(exc_info.value)
        client.aio.models.generate_content.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_student_context_flows_through_pipeline(self):
        profile = "Ben, Y8. Mastered fractions; introduced to indices last session."
        with fresh_gemini(
            generate_return=gemini_response(parsed=SAMPLE_RESPONSE)
        ) as (_, client):
            await generate_teach_response(**ENGINE_KWARGS, student_context=profile)

        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert contents.endswith(f"{STUDENT_CONTEXT_HEADER}\n{profile}")


# ---------------------------------------------------------------------------
# Error paths beyond the checklist
# ---------------------------------------------------------------------------

class TestErrorPaths:
    @pytest.mark.asyncio
    async def test_gemini_sdk_failure_raises_generation_error(self):
        with fresh_gemini(generate_side_effect=RuntimeError("503 model overloaded")):
            with pytest.raises(GenerationError) as exc_info:
                await generate_structured_response("prompt")

        assert "503 model overloaded" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_empty_response_body_raises_generation_error(self):
        with fresh_gemini(generate_return=gemini_response(parsed=None, text=None)):
            with pytest.raises(GenerationError):
                await generate_structured_response("prompt")

    @pytest.mark.asyncio
    async def test_schema_violating_parsed_payload_raises_generation_error(self):
        with fresh_gemini(
            generate_return=gemini_response(parsed={"parts": [{"bogus": True}]})
        ):
            with pytest.raises(GenerationError):
                await generate_structured_response("prompt")

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


# ---------------------------------------------------------------------------
# Structured-output parsing fallbacks
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
# Router-side retrieval toolkit (locked contract; call site moved only)
# ---------------------------------------------------------------------------

class TestRetrievalToolkit:
    @pytest.mark.asyncio
    async def test_retrieve_chunks_uses_locked_filter(self):
        db = FakeRetrievalSession(make_rows())
        rows = await generation_engine.retrieve_chunks(
            db,
            subject="Stage 4 Mathematics",
            topic="Indices",
            query_embedding=[0.1] * 768,
        )

        assert len(rows) == 2
        _, params = db.calls[0]
        assert params["subject"] == "Stage 4 Mathematics"
        assert params["topic"] == "Indices"
        assert params["query_embedding"].startswith("[0.1,")

    def test_build_citations_mirrors_rows(self):
        rows = make_rows()
        citations = build_citations(rows)
        assert len(citations) == 2
        assert citations[0]["id"] == str(rows[0]["id"])
        assert citations[0]["content_code"] == "MA4-IND-C-01"
        assert citations[0]["topic"] == "Indices"
        assert citations[0]["distance"] == pytest.approx(0.21)

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
        assert build_citations(rows) == [
            {
                "id": str(row_id),
                "content_code": None,
                "subject": "Stage 5 Mathematics",
                "topic": None,
                "source_document": None,
                "distance": None,
            }
        ]

    def test_format_rag_chunks_numbers_chunks(self):
        formatted = format_rag_chunks(make_rows())
        assert "[Chunk 1]" in formatted
        assert "[Chunk 2]" in formatted
        assert "Index laws" in formatted


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

class TestBuildPrompt:
    def test_all_placeholders_supplied_for_every_intent(self):
        for intent in TutorIntent:
            prompt = build_prompt(
                intent=intent.value,
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

    def test_chat_intent_includes_refinements(self):
        prompt = build_prompt(
            intent="chat",
            rag_chunks="CHUNKS",
            year_level=12,
            subject="Mathematics Standard 2",
            ability_tier="Band 3/4",
            refinements="explain compound interest simply",
        )
        assert "explain compound interest simply" in prompt

    def test_unknown_intent_raises(self):
        with pytest.raises(UnsupportedIntentError):
            build_prompt(
                intent="nope",
                rag_chunks="",
                year_level=7,
                subject="Stage 4 Mathematics",
                ability_tier="Core",
                refinements="",
            )
