"""
Tests for the smart question router: tier classification, prompt building,
JSON extraction/parsing, and the retry behaviour around the Gemini call.
"""
import asyncio
import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import question_router
from app.services.question_router import (
    ModelTier,
    ModularQuestion,
    QuestionGenerationRequest,
    RegenerationRequest,
    TIER_CONFIGS,
    _build_generation_prompt,
    _call_gemini,
    _extract_json,
    _parse_questions,
    classify_tier,
    generate_questions,
    regenerate_question,
)


def _request(**overrides) -> QuestionGenerationRequest:
    payload = {
        "course": "Mathematics Advanced",
        "subject": "Mathematics",
        "topic_summary": "Differentiation of polynomials",
        "difficulty": "Medium",
        "num_questions": 3,
    }
    payload.update(overrides)
    return QuestionGenerationRequest(**payload)


def _question_payload(**overrides) -> dict:
    payload = {
        "id": "q1",
        "topic": "Calculus",
        "marks": 2,
        "requires_diagram": False,
        "question_latex": "\\item Differentiate $x^2$.",
        "teacher_answer_latex": "$2x$",
    }
    payload.update(overrides)
    return payload


# ===========================================================================
# Tier classification
# ===========================================================================

class TestClassifyTier:
    """Diagram-flavoured requests route to Tier 2, everything else to Tier 1."""

    def test_plain_algebra_uses_tier_one(self):
        """A request with no spatial keywords stays on the cheapest tier."""
        assert classify_tier(_request(topic_summary="Index laws and surds")) == ModelTier.TEXT_MATH

    def test_diagram_keyword_in_topic_promotes_to_tier_two(self):
        """A topic mentioning graphs routes to the diagram tier."""
        assert classify_tier(_request(topic_summary="Graph sketching")) == ModelTier.COMPLEX_DIAGRAM

    def test_keyword_in_custom_instructions_promotes_to_tier_two(self):
        """Custom instructions are searched as well as the topic."""
        request = _request(topic_summary="Index laws", custom_instructions="Add a unit circle diagram")
        assert classify_tier(request) == ModelTier.COMPLEX_DIAGRAM

    def test_keyword_in_include_list_promotes_to_tier_two(self):
        """The include list contributes to the keyword search text."""
        request = _request(topic_summary="Index laws", include=["Parabola vertex form"])
        assert classify_tier(request) == ModelTier.COMPLEX_DIAGRAM

    def test_keyword_in_subject_promotes_to_tier_two(self):
        """The subject field also feeds the classifier."""
        request = _request(topic_summary="Index laws", subject="Coordinate geometry")
        assert classify_tier(request) == ModelTier.COMPLEX_DIAGRAM

    def test_matching_is_case_insensitive(self):
        """Keyword matching lowercases the search text first."""
        assert classify_tier(_request(topic_summary="TRIANGLE Congruence")) == ModelTier.COMPLEX_DIAGRAM

    def test_exclude_list_does_not_promote_tier(self):
        """Excluded content must not drag the request onto a pricier tier."""
        request = _request(topic_summary="Index laws", exclude=["circle geometry"])
        assert classify_tier(request) == ModelTier.TEXT_MATH


class TestTierConfigs:
    """Each tier is configured with a model and a thinking budget."""

    def test_every_tier_has_a_config(self):
        """All three tiers are present in the config table."""
        assert set(TIER_CONFIGS) == set(ModelTier)

    def test_tier_one_disables_thinking(self):
        """Tier 1 is the cheap path and does not pay for thinking tokens."""
        config = TIER_CONFIGS[ModelTier.TEXT_MATH]
        assert config["thinking"] is False
        assert config["thinking_budget"] == 0

    def test_premium_tiers_enable_thinking(self):
        """Tiers 2 and 3 enable thinking with a non-zero budget."""
        for tier in (ModelTier.COMPLEX_DIAGRAM, ModelTier.ADVANCED_FALLBACK):
            assert TIER_CONFIGS[tier]["thinking"] is True
            assert TIER_CONFIGS[tier]["thinking_budget"] > 0


# ===========================================================================
# Prompt building
# ===========================================================================

class TestBuildGenerationPrompt:
    """The user prompt echoes the request fields that Gemini needs."""

    def test_includes_core_settings(self):
        """Course, subject, topic, difficulty and count all appear."""
        prompt = _build_generation_prompt(_request())
        assert "Generate 3 Medium questions" in prompt
        assert "Course: Mathematics Advanced" in prompt
        assert "Subject: Mathematics" in prompt
        assert "Topic: Differentiation of polynomials" in prompt
        assert "Mode: PEDAGOGY" in prompt

    def test_optional_sections_are_omitted_when_empty(self):
        """Empty lists do not produce dangling prompt headings."""
        prompt = _build_generation_prompt(_request())
        for label in ("Outcomes:", "Dot points:", "Must include:", "Must exclude:", "Custom instructions:"):
            assert label not in prompt

    def test_optional_sections_are_rendered_when_present(self):
        """Syllabus data is comma-joined into the prompt."""
        prompt = _build_generation_prompt(_request(
            syllabus_outcomes=["MA11-1", "MA11-2"],
            syllabus_dot_points=["C1.1"],
            include=["chain rule"],
            exclude=["implicit differentiation"],
            custom_instructions="Keep answers short",
        ))
        assert "Outcomes: MA11-1, MA11-2" in prompt
        assert "Dot points: C1.1" in prompt
        assert "Must include: chain rule" in prompt
        assert "Must exclude: implicit differentiation" in prompt
        assert "Custom instructions: Keep answers short" in prompt

    def test_ends_with_json_only_instruction(self):
        """The prompt closes by demanding JSON-only output."""
        assert _build_generation_prompt(_request()).rstrip().endswith("Respond with ONLY the JSON object.")


# ===========================================================================
# JSON extraction
# ===========================================================================

class TestExtractJson:
    """Raw LLM text is reduced to the JSON object it contains."""

    def test_plain_json_passes_through(self):
        """A bare JSON object is returned unchanged."""
        assert _extract_json('{"questions": []}') == '{"questions": []}'

    def test_strips_json_code_fence(self):
        """A ```json fence is removed."""
        raw = '```json\n{"questions": [1]}\n```'
        assert json.loads(_extract_json(raw)) == {"questions": [1]}

    def test_strips_bare_code_fence(self):
        """An unlabelled ``` fence is removed."""
        raw = '```\n{"questions": [2]}\n```'
        assert json.loads(_extract_json(raw)) == {"questions": [2]}

    def test_strips_prose_around_json(self):
        """Chatter before and after the object is discarded."""
        raw = 'Sure! Here you go:\n{"questions": []}\nHope that helps.'
        assert _extract_json(raw) == '{"questions": []}'

    def test_keeps_outermost_braces_with_nested_objects(self):
        """Nested objects are preserved by slicing to the last closing brace."""
        raw = 'noise {"questions": [{"id": "a"}]} trailing'
        assert json.loads(_extract_json(raw))["questions"][0]["id"] == "a"

    def test_text_without_braces_is_stripped_and_returned(self):
        """Output with no JSON at all is returned trimmed."""
        assert _extract_json("  no json here  ") == "no json here"


# ===========================================================================
# Response parsing
# ===========================================================================

class TestParseQuestions:
    """JSON responses become validated ModularQuestion objects."""

    def test_parses_valid_payload(self):
        """A well-formed payload parses into ModularQuestion instances."""
        raw = json.dumps({"questions": [_question_payload(), _question_payload(id="q2", marks=3)]})
        questions = _parse_questions(raw)
        assert [q.id for q in questions] == ["q1", "q2"]
        assert isinstance(questions[0], ModularQuestion)
        assert questions[1].marks == 3

    def test_parses_payload_wrapped_in_fence(self):
        """Fenced payloads are unwrapped before parsing."""
        raw = "```json\n" + json.dumps({"questions": [_question_payload()]}) + "\n```"
        assert len(_parse_questions(raw)) == 1

    def test_missing_id_is_generated(self):
        """Questions without an id are given a generated one."""
        raw = json.dumps({"questions": [_question_payload(id="")]})
        question = _parse_questions(raw)[0]
        assert question.id.startswith("q_")
        assert len(question.id) == 10

    def test_empty_questions_array_raises(self):
        """An empty questions array is treated as a failed generation."""
        with pytest.raises(ValueError, match="no 'questions' array"):
            _parse_questions(json.dumps({"questions": []}))

    def test_missing_questions_key_raises(self):
        """A payload without the questions key is rejected."""
        with pytest.raises(ValueError):
            _parse_questions(json.dumps({"items": []}))

    def test_invalid_json_raises(self):
        """Unparseable JSON propagates a JSONDecodeError."""
        with pytest.raises(json.JSONDecodeError):
            _parse_questions("{not json")

    def test_missing_required_field_raises(self):
        """Pydantic validation rejects a question missing a required field."""
        payload = _question_payload()
        del payload["teacher_answer_latex"]
        with pytest.raises(Exception):
            _parse_questions(json.dumps({"questions": [payload]}))


# ===========================================================================
# Gemini call plumbing
# ===========================================================================

def _mock_client(response_text=None, side_effect=None):
    client = MagicMock()
    if side_effect is not None:
        client.aio.models.generate_content = AsyncMock(side_effect=side_effect)
    else:
        client.aio.models.generate_content = AsyncMock(
            return_value=MagicMock(text=response_text)
        )
    return client


class TestCallGemini:
    """_call_gemini applies tier config and retries transient failures."""

    def test_returns_stripped_response_text(self):
        """A successful call returns the trimmed response text."""
        client = _mock_client(response_text="  {\"questions\": []}  ")
        with patch.object(question_router, "get_client", return_value=client):
            result = asyncio.run(_call_gemini("prompt", "system", ModelTier.TEXT_MATH))
        assert result == '{"questions": []}'

    def test_uses_the_model_for_the_requested_tier(self):
        """The configured model for the tier is passed to Gemini."""
        client = _mock_client(response_text="{}")
        with patch.object(question_router, "get_client", return_value=client):
            asyncio.run(_call_gemini("prompt", "system", ModelTier.ADVANCED_FALLBACK))
        kwargs = client.aio.models.generate_content.call_args.kwargs
        assert kwargs["model"] == TIER_CONFIGS[ModelTier.ADVANCED_FALLBACK]["model"]
        assert kwargs["contents"] == "prompt"

    def test_retries_then_succeeds(self):
        """A transient error is retried and the later success is returned."""
        client = _mock_client(side_effect=[RuntimeError("boom"), MagicMock(text="ok")])
        with patch.object(question_router, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            result = asyncio.run(_call_gemini("prompt", "system", ModelTier.TEXT_MATH))
        assert result == "ok"
        assert client.aio.models.generate_content.await_count == 2

    def test_gives_up_after_three_attempts(self):
        """Persistent failures raise RuntimeError after three attempts."""
        client = _mock_client(side_effect=RuntimeError("boom"))
        with patch.object(question_router, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            with pytest.raises(RuntimeError, match="failed after 3 attempts"):
                asyncio.run(_call_gemini("prompt", "system", ModelTier.TEXT_MATH))
        assert client.aio.models.generate_content.await_count == 3

    def test_rate_limit_errors_back_off_exponentially(self):
        """A 429 error backs off with doubling delays before failing."""
        client = _mock_client(side_effect=RuntimeError("429 ResourceExhausted"))
        sleep_mock = AsyncMock()
        with patch.object(question_router, "get_client", return_value=client), \
             patch("asyncio.sleep", new=sleep_mock):
            with pytest.raises(RuntimeError):
                asyncio.run(_call_gemini("prompt", "system", ModelTier.TEXT_MATH))
        assert [call.args[0] for call in sleep_mock.await_args_list] == [2, 4, 8]


# ===========================================================================
# Public API
# ===========================================================================

class TestGenerateQuestions:
    """generate_questions routes, calls Gemini and parses the result."""

    def test_routes_using_the_classifier(self):
        """Without a forced tier the classifier picks the tier."""
        payload = json.dumps({"questions": [_question_payload()]})
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value=payload)) as call:
            questions = asyncio.run(generate_questions(_request(topic_summary="Sketch the parabola")))
        assert call.await_args.args[2] == ModelTier.COMPLEX_DIAGRAM
        assert len(questions) == 1

    def test_force_tier_overrides_the_classifier(self):
        """An explicit force_tier wins over classification."""
        payload = json.dumps({"questions": [_question_payload()]})
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value=payload)) as call:
            asyncio.run(generate_questions(
                _request(topic_summary="Sketch the parabola"),
                force_tier=ModelTier.TEXT_MATH,
            ))
        assert call.await_args.args[2] == ModelTier.TEXT_MATH

    def test_propagates_parse_failures(self):
        """A response with no questions surfaces as a ValueError."""
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value='{"questions": []}')):
            with pytest.raises(ValueError):
                asyncio.run(generate_questions(_request()))


class TestRegenerateQuestion:
    """regenerate_question always uses the premium fallback tier."""

    def test_uses_tier_three_and_returns_first_question(self):
        """The corrected question comes back from Tier 3."""
        payload = json.dumps({"questions": [_question_payload(id="fixed")]})
        request = RegenerationRequest(
            original_question_latex="\\item broken tikz",
            error_feedback="axes are wrong",
            topic="Graphing",
            marks=4,
        )
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value=payload)) as call:
            question = asyncio.run(regenerate_question(request))
        assert question.id == "fixed"
        assert call.await_args.args[2] == ModelTier.ADVANCED_FALLBACK

    def test_prompt_carries_latex_feedback_and_metadata(self):
        """The regeneration prompt includes the LaTeX, feedback, topic and marks."""
        payload = json.dumps({"questions": [_question_payload()]})
        request = RegenerationRequest(
            original_question_latex="\\item broken tikz",
            error_feedback="axes are wrong",
            topic="Graphing",
            marks=4,
        )
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value=payload)) as call:
            asyncio.run(regenerate_question(request))
        prompt = call.await_args.args[0]
        assert "\\item broken tikz" in prompt
        assert "TEACHER FEEDBACK:\naxes are wrong" in prompt
        assert "Topic: Graphing" in prompt
        assert "Marks: 4" in prompt

    def test_feedback_section_omitted_when_blank(self):
        """No feedback section is added when the teacher left no comment."""
        payload = json.dumps({"questions": [_question_payload()]})
        request = RegenerationRequest(original_question_latex="\\item broken")
        with patch.object(question_router, "_call_gemini", new=AsyncMock(return_value=payload)) as call:
            asyncio.run(regenerate_question(request))
        assert "TEACHER FEEDBACK" not in call.await_args.args[0]
