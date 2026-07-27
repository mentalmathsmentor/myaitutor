"""
Tests for the optical extraction pipeline: sort key generation, fence
stripping, insertion positioning, persistence and placeholder counting.
Gemini vision and the element service are mocked.
"""
import asyncio
import base64
import json
import sys

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import image_to_fragment_service
from app.services.image_to_fragment_service import _make_sort_keys_after, vision_parse

_PLACEHOLDER_LATEX = (
    "\\begin{center}\\begin{tcolorbox}[height=6cm, dashed]"
    "\\textit{a photo of a bridge}\\end{tcolorbox}\\end{center}"
)


def _genai_types():
    """The stubbed google.genai.types module, with call history cleared."""
    types_module = sys.modules["google.genai"].types
    types_module.reset_mock()
    return types_module


def _fragment(kind="question", label="Question 1", content_latex="\\item Solve for x"):
    return {"kind": kind, "label": label, "content_latex": content_latex}


def _mock_client(response_text):
    client = MagicMock()
    client.aio.models.generate_content = AsyncMock(return_value=MagicMock(text=response_text))
    return client


def _run(response_text, existing=None, **kwargs):
    """Run vision_parse with Gemini and the element service mocked out."""
    created = []

    async def fake_create(session, **element):
        created.append(element)
        return {"id": f"elem_{len(created)}", **element}

    with patch.object(image_to_fragment_service, "get_client", return_value=_mock_client(response_text)), \
         patch.object(image_to_fragment_service, "get_elements_for_student",
                      new=AsyncMock(return_value=existing if existing is not None else [])), \
         patch.object(image_to_fragment_service, "create_element_for_student", new=fake_create):
        saved, placeholders = asyncio.run(vision_parse(
            session=MagicMock(),
            image_base64=base64.b64encode(b"fake-png-bytes").decode(),
            image_mime_type="image/png",
            doc_id="doc_1",
            student_id="alice",
            **kwargs,
        ))
    return saved, placeholders, created


# ===========================================================================
# Sort key generation
# ===========================================================================

class TestMakeSortKeysAfter:
    """Generated keys sort after the anchor and among themselves."""

    def test_keys_are_suffixed_with_an_index(self):
        """Each key extends the anchor with 'V' plus its position."""
        assert _make_sort_keys_after("a2", 3) == ["a2V0", "a2V1", "a2V2"]

    def test_keys_sort_after_the_anchor(self):
        """Every generated key is lexicographically greater than the anchor."""
        assert all(key > "a2" for key in _make_sort_keys_after("a2", 3))

    def test_keys_are_ordered(self):
        """The keys are returned in ascending order."""
        keys = _make_sort_keys_after("a2", 5)
        assert keys == sorted(keys)

    def test_zero_count_returns_no_keys(self):
        """Asking for no keys returns an empty list."""
        assert _make_sort_keys_after("a2", 0) == []


# ===========================================================================
# Response parsing
# ===========================================================================

class TestResponseParsing:
    """The model's JSON array is parsed, with fences tolerated."""

    def test_plain_json_array_is_parsed(self):
        """A bare JSON array becomes saved elements."""
        saved, _, created = _run(json.dumps([_fragment()]))
        assert len(saved) == 1
        assert created[0]["content_latex"] == "\\item Solve for x"

    def test_markdown_fences_are_stripped(self):
        """A ```json fenced array is unwrapped before parsing."""
        raw = "```json\n" + json.dumps([_fragment()]) + "\n```"
        saved, _, _ = _run(raw)
        assert len(saved) == 1

    def test_bare_fences_are_stripped(self):
        """A fence without a language tag is also handled."""
        raw = "```\n" + json.dumps([_fragment(), _fragment(label="Question 2")]) + "\n```"
        saved, _, _ = _run(raw)
        assert len(saved) == 2

    def test_surrounding_whitespace_is_ignored(self):
        """Leading and trailing whitespace does not break parsing."""
        saved, _, _ = _run("\n\n  " + json.dumps([_fragment()]) + "  \n")
        assert len(saved) == 1

    def test_invalid_json_raises(self):
        """A non-JSON response is surfaced as a decode error."""
        with pytest.raises(json.JSONDecodeError):
            _run("Sorry, I could not read the image.")

    def test_empty_array_saves_nothing(self):
        """An empty array produces no elements and no placeholders."""
        saved, placeholders, created = _run("[]")
        assert saved == []
        assert placeholders == 0
        assert created == []


# ===========================================================================
# Persistence
# ===========================================================================

class TestPersistence:
    """Each fragment is written through the element service."""

    def test_fragment_fields_are_forwarded(self):
        """Kind, label and LaTeX are passed to the element service."""
        _, _, created = _run(json.dumps([_fragment(kind="diagram", label="Diagram — parabola")]))
        assert created[0]["kind"] == "diagram"
        assert created[0]["label"] == "Diagram — parabola"
        assert created[0]["document_id"] == "doc_1"
        assert created[0]["student_id"] == "alice"

    def test_missing_fields_fall_back_to_defaults(self):
        """A sparse fragment still yields a usable element."""
        _, _, created = _run(json.dumps([{}]))
        assert created[0]["kind"] == "question"
        assert created[0]["label"] == "Scanned Element"
        assert created[0]["content_latex"] == ""

    def test_fragments_get_increasing_sort_keys(self):
        """Multiple fragments are inserted in order."""
        _, _, created = _run(
            json.dumps([_fragment(), _fragment(label="Q2"), _fragment(label="Q3")]),
            insert_after_sort_key="a5",
        )
        assert [element["sort_key"] for element in created] == ["a5V0", "a5V1", "a5V2"]

    def test_insertion_point_defaults_to_the_last_element(self):
        """Without an explicit anchor, fragments land after the last element."""
        _, _, created = _run(
            json.dumps([_fragment()]),
            existing=[{"sortKey": "a1"}, {"sortKey": "a7"}],
        )
        assert created[0]["sort_key"] == "a7V0"

    def test_empty_document_starts_at_the_base_key(self):
        """An empty document anchors the first fragment at 'a0'."""
        _, _, created = _run(json.dumps([_fragment()]), existing=[])
        assert created[0]["sort_key"] == "a0V0"


# ===========================================================================
# Placeholder accounting
# ===========================================================================

class TestPlaceholderCount:
    """Bail-out placeholders are counted for the caller."""

    def test_counts_dashed_tcolorbox_placeholders(self):
        """A dashed tcolorbox fragment counts as a placeholder."""
        _, placeholders, _ = _run(json.dumps([
            _fragment(kind="diagram", content_latex=_PLACEHOLDER_LATEX),
            _fragment(),
        ]))
        assert placeholders == 1

    def test_counts_every_placeholder(self):
        """Multiple placeholders are all counted."""
        _, placeholders, _ = _run(json.dumps([
            _fragment(kind="diagram", content_latex=_PLACEHOLDER_LATEX),
            _fragment(kind="diagram", content_latex=_PLACEHOLDER_LATEX),
        ]))
        assert placeholders == 2

    def test_tikz_diagrams_are_not_placeholders(self):
        """Real TikZ output is not counted as a placeholder."""
        _, placeholders, _ = _run(json.dumps([
            _fragment(kind="diagram", content_latex="\\begin{tikzpicture}\\end{tikzpicture}"),
        ]))
        assert placeholders == 0

    def test_solid_tcolorbox_is_not_a_placeholder(self):
        """A tcolorbox without the dashed marker is genuine content."""
        _, placeholders, _ = _run(json.dumps([
            _fragment(content_latex="\\begin{tcolorbox}Definition\\end{tcolorbox}"),
        ]))
        assert placeholders == 0


# ===========================================================================
# Gemini request shape
# ===========================================================================

class TestGeminiRequest:
    """The image is sent as inline binary data with the vision prompt."""

    def test_image_is_decoded_and_sent_inline(self):
        """The base64 payload is decoded before being attached."""
        genai_types = _genai_types()
        _run(json.dumps([_fragment()]))
        assert genai_types.Blob.call_args.kwargs == {
            "mime_type": "image/png",
            "data": b"fake-png-bytes",
        }

    def test_system_prompt_and_limits_are_configured(self):
        """The digitizer system prompt and generation limits are applied."""
        genai_types = _genai_types()
        _run(json.dumps([_fragment()]))
        config_kwargs = genai_types.GenerateContentConfig.call_args.kwargs
        assert config_kwargs["system_instruction"] == image_to_fragment_service.VISION_PARSE_SYSTEM_PROMPT
        assert config_kwargs["max_output_tokens"] == 2000
        assert config_kwargs["temperature"] == 0.1
