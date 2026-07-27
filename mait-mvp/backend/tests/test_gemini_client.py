"""
Tests for the Gemini client wrapper: lockout short-circuiting, prompt
assembly, retry/timeout handling and response formatting.
The Gemini SDK is stubbed out (see conftest.py) and the client is mocked.
"""
import asyncio
import sys

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models import FatigueStatus
from app.services import gemini_client
from app.services.gemini_client import (
    FATIGUE_INSTRUCTIONS,
    format_response_as_text,
    get_client,
    get_gemini_response,
)


def _mock_client(response_text=None, side_effect=None):
    client = MagicMock()
    if side_effect is not None:
        client.aio.models.generate_content = AsyncMock(side_effect=side_effect)
    else:
        client.aio.models.generate_content = AsyncMock(return_value=MagicMock(text=response_text))
    return client


def _call(**kwargs):
    return asyncio.run(get_gemini_response(**kwargs))


@pytest.fixture
def genai_types():
    """The stubbed google.genai.types module, with call history cleared."""
    types_module = sys.modules["google.genai"].types
    types_module.reset_mock()
    return types_module


# ===========================================================================
# Client construction
# ===========================================================================

class TestGetClient:
    """get_client lazily constructs and caches a single SDK client."""

    def test_client_is_created_once_and_cached(self):
        """Repeated calls reuse the same client instance."""
        with patch.object(gemini_client, "client", None):
            first = get_client()
            second = get_client()
        assert first is second


# ===========================================================================
# Fatigue behaviour
# ===========================================================================

class TestFatigueHandling:
    """Fatigue state gates the call and shapes the prompt."""

    def test_lockout_short_circuits_without_calling_gemini(self):
        """A locked-out student gets a canned rest message and no API call."""
        client = _mock_client(response_text="should not be used")
        with patch.object(gemini_client, "get_client", return_value=client):
            result = _call(question="Explain limits", fatigue_state=FatigueStatus.LOCKOUT)
        assert result["core_truth"] == "Rest Required"
        assert "rest" in result["explanation"].lower()
        client.aio.models.generate_content.assert_not_awaited()

    def test_weary_state_reduces_the_token_budget(self, genai_types):
        """WEARY students get a smaller max_output_tokens budget."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q", fatigue_state=FatigueStatus.WEARY)
        assert genai_types.GenerateContentConfig.call_args.kwargs["max_output_tokens"] == 500

    def test_fresh_state_uses_the_full_token_budget(self, genai_types):
        """FRESH students get the larger budget."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q", fatigue_state=FatigueStatus.FRESH)
        assert genai_types.GenerateContentConfig.call_args.kwargs["max_output_tokens"] == 1500

    def test_fatigue_instruction_is_embedded_in_the_system_prompt(self, genai_types):
        """The per-state data-complexity instruction reaches the system prompt."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q", fatigue_state=FatigueStatus.WEARY)
        system_instruction = genai_types.GenerateContentConfig.call_args.kwargs["system_instruction"]
        assert FATIGUE_INSTRUCTIONS[FatigueStatus.WEARY] in system_instruction
        assert "simple greeting" in system_instruction

    def test_bloom_instruction_defaults_when_missing(self, genai_types):
        """Without a Bloom's instruction a neutral default is used."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q")
        system_instruction = genai_types.GenerateContentConfig.call_args.kwargs["system_instruction"]
        assert "No specific Bloom's level instruction" in system_instruction

    def test_bloom_instruction_is_forwarded(self, genai_types):
        """A supplied Bloom's instruction is injected verbatim."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q", bloom_instruction="Push towards ANALYZE")
        system_instruction = genai_types.GenerateContentConfig.call_args.kwargs["system_instruction"]
        assert "Push towards ANALYZE" in system_instruction


# ===========================================================================
# Prompt and history assembly
# ===========================================================================

class TestPromptAssembly:
    """The question, syllabus context and history become SDK contents."""

    def test_question_topic_and_context_reach_the_prompt(self, genai_types):
        """Topic, RAG context and the student question are all included."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(
                question="What is the chain rule?",
                syllabus_context="[MA-C2] chain rule content",
                current_topic="Mathematics Extension 1",
            )
        prompt = genai_types.Part.call_args.kwargs["text"]
        assert "What is the chain rule?" in prompt
        assert "[MA-C2] chain rule content" in prompt
        assert "Mathematics Extension 1" in prompt

    def test_missing_context_falls_back_to_general_content(self, genai_types):
        """An empty syllabus context is replaced with a general note."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q")
        assert "General Mathematics Advanced content" in genai_types.Part.call_args.kwargs["text"]

    def test_history_is_turned_into_multi_turn_contents(self, genai_types):
        """Prior turns are replayed as user/model contents before the question."""
        client = _mock_client(response_text="data")
        history = [
            {"role": "user", "content": "What is a derivative?"},
            {"role": "assistant", "content": "It is a rate of change."},
        ]
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="And the second derivative?", conversation_history=history)
        roles = [call.kwargs["role"] for call in genai_types.Content.call_args_list]
        assert roles == ["user", "model", "user"]

    def test_no_history_sends_only_the_current_question(self, genai_types):
        """Without history a single content entry is sent."""
        client = _mock_client(response_text="data")
        with patch.object(gemini_client, "get_client", return_value=client):
            _call(question="q")
        assert len(genai_types.Content.call_args_list) == 1


# ===========================================================================
# Response handling
# ===========================================================================

class TestResponseHandling:
    """Successful responses are split into sections for the chat UI."""

    def test_sections_are_split_on_blank_lines(self):
        """Double newlines delimit response sections."""
        client = _mock_client(response_text="  First part.\n\nSecond part.\n\n\nThird part.  ")
        with patch.object(gemini_client, "get_client", return_value=client):
            result = _call(question="q")
        assert result["sections"] == ["First part.", "Second part.", "Third part."]
        assert result["source"] == "api"
        assert result["text"] == "First part.\n\nSecond part.\n\n\nThird part."

    def test_single_paragraph_yields_one_section(self):
        """A single paragraph produces one section."""
        client = _mock_client(response_text="Only one thing to say.")
        with patch.object(gemini_client, "get_client", return_value=client):
            assert _call(question="q")["sections"] == ["Only one thing to say."]


class TestRetryBehaviour:
    """Timeouts and API errors are retried before degrading gracefully."""

    def test_timeout_is_retried_then_reports_a_timeout_message(self):
        """Three consecutive timeouts produce a user-facing timeout message."""
        client = _mock_client(side_effect=asyncio.TimeoutError())
        with patch.object(gemini_client, "get_client", return_value=client):
            result = _call(question="q")
        assert result["text"] == "Server timeout. Please try again."
        assert client.aio.models.generate_content.await_count == 3

    def test_transient_error_is_retried_then_succeeds(self):
        """A failed first attempt is followed by a successful retry."""
        client = _mock_client(side_effect=[RuntimeError("boom"), MagicMock(text="recovered")])
        with patch.object(gemini_client, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            assert _call(question="q")["text"] == "recovered"

    def test_persistent_error_returns_a_friendly_message(self):
        """Repeated API errors degrade to a generic apology, not an exception."""
        client = _mock_client(side_effect=RuntimeError("boom"))
        with patch.object(gemini_client, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            result = _call(question="q")
        assert result["text"].startswith("Something went wrong")
        assert client.aio.models.generate_content.await_count == 3

    def test_rate_limit_errors_back_off_exponentially(self):
        """429 responses back off with doubling delays."""
        client = _mock_client(side_effect=RuntimeError("429 ResourceExhausted"))
        sleep_mock = AsyncMock()
        with patch.object(gemini_client, "get_client", return_value=client), \
             patch("asyncio.sleep", new=sleep_mock):
            result = _call(question="q")
        assert [call.args[0] for call in sleep_mock.await_args_list] == [2, 4, 8]
        assert result["text"] == "Failed to get response."


# ===========================================================================
# Formatting for the chat UI
# ===========================================================================

class TestFormatResponseAsText:
    """format_response_as_text handles both the new and legacy shapes."""

    def test_new_format_returns_text_verbatim(self):
        """A response with a 'text' key is returned as-is."""
        assert format_response_as_text({"text": "hello", "sections": ["hello"]}) == "hello"

    def test_legacy_format_is_assembled_from_parts(self):
        """The legacy triple is rendered as bold truth, body and hint."""
        formatted = format_response_as_text({
            "core_truth": "Derivative = rate of change",
            "explanation": "It measures instantaneous change.",
            "hints": "Try first principles.",
        })
        assert formatted.startswith("**Derivative = rate of change**")
        assert "It measures instantaneous change." in formatted
        assert "Try first principles." in formatted

    def test_legacy_format_skips_empty_parts(self):
        """Missing legacy fields do not leave stray formatting."""
        assert format_response_as_text({"core_truth": "Only truth"}) == "**Only truth**"

    def test_empty_response_becomes_empty_string(self):
        """An empty dict formats to an empty string."""
        assert format_response_as_text({}) == ""
