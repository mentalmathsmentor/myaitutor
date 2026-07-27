"""
Tests for the Artifact Generation Engine: syllabus catalogue lookups,
prompt building, LaTeX extraction/sanitisation and the PDF compile step.
"""
import asyncio
import os

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import artifact_engine
from app.services.artifact_engine import (
    FALLBACK_LATEX_TEMPLATE,
    LegacyFields,
    SYLLABUS_TOPICS,
    SyllabusPacket,
    WorksheetRequest,
    WorksheetSettings,
    _build_user_prompt,
    _extract_latex,
    _sanitize_latex,
    compile_latex_to_pdf,
    generate_worksheet_latex,
    generate_worksheet_pdf,
    get_all_topics,
    get_topics_for_year,
)


def _settings(**overrides) -> WorksheetSettings:
    payload = {
        "course": "Mathematics Advanced",
        "subject": "Mathematics",
        "difficulty": "Medium",
        "numberOfQuestions": 6,
        "headerSpaces": "",
        "workingSpace": "Medium",
        "marks": "Yes",
        "answerKey": "No",
        "watermark": False,
        "mode": "PEDAGOGY",
    }
    payload.update(overrides)
    return WorksheetSettings(**payload)


def _packet(**overrides) -> SyllabusPacket:
    payload = {
        "topicSummary": "",
        "outcomes": [],
        "dotPoints": [],
        "include": [],
        "exclude": [],
        "assessmentEmphasis": [],
        "questionStyleNotes": [],
    }
    payload.update(overrides)
    return SyllabusPacket(**payload)


def _request(settings=None, packet=None, **overrides) -> WorksheetRequest:
    payload = {
        "requestVersion": "1",
        "worksheetSettings": settings or _settings(),
        "topicSummary": "Differentiation",
        "syllabusPacket": packet or _packet(),
        "pedagogicalDrills": [],
        "customInstructions": "",
        "legacyFields": LegacyFields(),
    }
    payload.update(overrides)
    return WorksheetRequest(**payload)


# ===========================================================================
# Syllabus catalogue
# ===========================================================================

class TestTopicCatalogue:
    """The NSW topic catalogue is exposed per year level."""

    def test_returns_topics_for_known_year(self):
        """Year 12 returns its catalogue entries with id/name/strand."""
        topics = get_topics_for_year(12)
        assert topics
        assert all({"id", "name", "strand"} <= set(topic) for topic in topics)

    def test_unknown_year_returns_empty_list(self):
        """A year level outside 7-12 yields no topics rather than raising."""
        assert get_topics_for_year(3) == []

    def test_get_all_topics_covers_years_seven_to_twelve(self):
        """The full catalogue is keyed by every supported year level."""
        assert set(get_all_topics()) == {7, 8, 9, 10, 11, 12}
        assert get_all_topics() is SYLLABUS_TOPICS

    def test_topic_ids_are_unique_within_a_year(self):
        """Topic ids do not collide inside a year level."""
        for year, topics in get_all_topics().items():
            ids = [topic["id"] for topic in topics]
            assert len(ids) == len(set(ids)), f"duplicate topic id in year {year}"


# ===========================================================================
# Prompt building
# ===========================================================================

class TestBuildUserPrompt:
    """The worksheet prompt mirrors the request settings and syllabus packet."""

    def test_header_uses_course_and_single_topic(self):
        """A single topic is used verbatim in the header line."""
        prompt = _build_user_prompt(_request())
        assert prompt.startswith("**Mathematics Advanced Differentiation Worksheet**")

    def test_multiple_topics_are_condensed_to_mixed(self):
        """Pipe-separated topics collapse to '<first> (Mixed)'."""
        prompt = _build_user_prompt(_request(topicSummary="Differentiation | Integration"))
        assert prompt.startswith("**Mathematics Advanced Differentiation (Mixed) Worksheet**")

    def test_blank_topic_falls_back_to_mathematics(self):
        """An empty topic summary falls back to a generic topic name."""
        prompt = _build_user_prompt(_request(topicSummary=" | "))
        assert "Mathematics Advanced Mathematics Worksheet" in prompt

    def test_settings_are_listed(self):
        """Course, question count, difficulty and mode are all rendered."""
        prompt = _build_user_prompt(_request())
        assert "- **Course:** Mathematics Advanced" in prompt
        assert "- **Number of Questions:** 6" in prompt
        assert "- **Difficulty:** Medium" in prompt
        assert "- **MODE:** PEDAGOGY" in prompt

    def test_blank_header_spaces_render_as_none(self):
        """An empty headerSpaces setting is rendered as 'None'."""
        assert "- **Header Spaces:** None" in _build_user_prompt(_request())

    def test_manual_prompt_replaces_the_syllabus_packet(self):
        """Legacy manual instructions take precedence over the packet."""
        request = _request(
            legacyFields=LegacyFields(manual_prompt="Use only past HSC questions"),
            packet=_packet(outcomes=["MA12-3"]),
        )
        prompt = _build_user_prompt(request)
        assert "**MANUAL INSTRUCTIONS:**" in prompt
        assert "Use only past HSC questions" in prompt
        assert "**SYLLABUS PACKET:**" not in prompt

    def test_syllabus_packet_fields_are_rendered(self):
        """Every populated packet list appears as a labelled bullet."""
        request = _request(packet=_packet(
            outcomes=["MA12-3"],
            dotPoints=["C2.1"],
            include=["chain rule"],
            exclude=["implicit"],
            assessmentEmphasis=["multi-step"],
            questionStyleNotes=["show working"],
        ))
        prompt = _build_user_prompt(request)
        assert "- **Outcomes:** MA12-3" in prompt
        assert "- **Relevant Dot-Points:** C2.1" in prompt
        assert "- **Include:** chain rule" in prompt
        assert "- **Exclude:** implicit" in prompt
        assert "- **Assessment Emphasis:** multi-step" in prompt
        assert "- **Question Style Notes:** show working" in prompt

    def test_empty_packet_states_no_syllabus_map(self):
        """An entirely empty packet is called out explicitly."""
        assert "- No direct syllabus map provided." in _build_user_prompt(_request())

    def test_custom_instructions_and_drills_are_appended(self):
        """Custom instructions and pedagogical drills get their own sections."""
        request = _request(
            customInstructions="No calculators",
            pedagogicalDrills=["Spot the Error", "Parameter Shift"],
        )
        prompt = _build_user_prompt(request)
        assert "**CUSTOM INSTRUCTIONS:**\n- No calculators" in prompt
        assert "**PEDAGOGICAL DRILLS REQUESTED:**\n- Spot the Error, Parameter Shift" in prompt

    def test_diagram_requirement_scales_with_question_count(self):
        """One diagram is demanded per three questions."""
        prompt = _build_user_prompt(_request(settings=_settings(numberOfQuestions=9)))
        assert "in at least 3 of the 9 questions" in prompt

    def test_diagram_requirement_has_a_floor_of_one(self):
        """Even a two-question worksheet must contain a diagram."""
        prompt = _build_user_prompt(_request(settings=_settings(numberOfQuestions=2)))
        assert "in at least 1 of the 2 questions" in prompt


# ===========================================================================
# LaTeX extraction and sanitisation
# ===========================================================================

class TestExtractLatex:
    """Gemini output is narrowed down to the enumerate block."""

    def test_strips_latex_code_fence(self):
        """A ```latex fence is removed."""
        raw = "```latex\n\\begin{enumerate}\\item A\\end{enumerate}\n```"
        assert _extract_latex(raw) == "\\begin{enumerate}\\item A\\end{enumerate}"

    def test_strips_tex_code_fence(self):
        """A ```tex fence is removed."""
        raw = "```tex\n\\begin{enumerate}\\item A\\end{enumerate}\n```"
        assert _extract_latex(raw) == "\\begin{enumerate}\\item A\\end{enumerate}"

    def test_strips_prose_around_the_block(self):
        """Chatter before and after the enumerate block is discarded."""
        raw = "Here is your worksheet:\n\\begin{enumerate}\\item A\\end{enumerate}\nEnjoy!"
        assert _extract_latex(raw) == "\\begin{enumerate}\\item A\\end{enumerate}"

    def test_keeps_last_end_tag_with_nested_lists(self):
        """The outermost enumerate span is kept when lists are nested."""
        raw = (
            "\\begin{enumerate}\\item A\n"
            "\\begin{enumerate}\\item A1\\end{enumerate}\n"
            "\\item B\\end{enumerate}"
        )
        extracted = _extract_latex(raw)
        assert extracted.startswith("\\begin{enumerate}")
        assert extracted.endswith("\\end{enumerate}")
        assert "\\item B" in extracted

    def test_output_without_enumerate_is_returned_trimmed(self):
        """Output with no enumerate block is passed through, trimmed."""
        assert _extract_latex("  just prose  ") == "just prose"


class TestSanitizeLatex:
    """Sanitisation removes commands and packages that break the compiler."""

    def test_boldsymbol_is_replaced(self):
        """\\boldsymbol is rewritten to the always-available \\mathbf."""
        assert _sanitize_latex("$\\boldsymbol{v}$") == "$\\mathbf{v}$"

    def test_parskip_package_is_removed(self):
        """\\usepackage{parskip} is stripped entirely."""
        assert _sanitize_latex("\\usepackage{parskip}\ntext").strip() == "text"

    def test_parskip_with_options_is_removed(self):
        """An optional argument does not save parskip from removal."""
        assert _sanitize_latex("\\usepackage[skip=4pt]{parskip}").strip() == ""

    def test_disallowed_package_is_removed(self):
        """Packages outside the allow-list are dropped."""
        assert _sanitize_latex("\\usepackage{pgfplots}").strip() == ""

    def test_allowed_package_is_kept(self):
        """Allow-listed packages survive sanitisation."""
        assert _sanitize_latex("\\usepackage{amsmath}") == "\\usepackage{amsmath}"

    def test_mixed_package_list_keeps_only_allowed_entries(self):
        """A comma-separated list is filtered down to allowed packages."""
        assert _sanitize_latex("\\usepackage{amsmath,pgfplots,tikz}") == "\\usepackage{amsmath,tikz}"

    def test_package_options_are_preserved_when_kept(self):
        """Options are re-emitted for packages that are kept."""
        assert _sanitize_latex("\\usepackage[hidelinks]{hyperref}") == "\\usepackage[hidelinks]{hyperref}"

    def test_body_content_is_untouched(self):
        """Ordinary LaTeX body content passes through unchanged."""
        body = "\\begin{enumerate}\\item Solve $x^2=4$.\\end{enumerate}"
        assert _sanitize_latex(body) == body


class TestFallbackTemplate:
    """The fallback template is a compilable enumerate block."""

    def test_template_is_an_enumerate_block(self):
        """The fallback still satisfies the enumerate contract."""
        assert "\\begin{enumerate}" in FALLBACK_LATEX_TEMPLATE
        assert "\\end{enumerate}" in FALLBACK_LATEX_TEMPLATE


# ===========================================================================
# Gemini LaTeX generation
# ===========================================================================

def _mock_client(response_text=None, side_effect=None):
    client = MagicMock()
    if side_effect is not None:
        client.aio.models.generate_content = AsyncMock(side_effect=side_effect)
    else:
        client.aio.models.generate_content = AsyncMock(return_value=MagicMock(text=response_text))
    return client


class TestGenerateWorksheetLatex:
    """generate_worksheet_latex sanitises output and retries failures."""

    def test_returns_sanitized_latex(self):
        """A valid response is extracted and sanitised before returning."""
        raw = "```latex\n\\usepackage{pgfplots}\n\\begin{enumerate}\\item $\\boldsymbol{v}$\\end{enumerate}\n```"
        client = _mock_client(response_text=raw)
        with patch.object(artifact_engine, "get_client", return_value=client):
            latex = asyncio.run(generate_worksheet_latex(_request()))
        assert latex.startswith("\\begin{enumerate}")
        assert "\\mathbf{v}" in latex

    def test_response_without_enumerate_is_retried_then_fails(self):
        """Output missing the enumerate block is retried three times."""
        client = _mock_client(response_text="Sorry, I cannot do that.")
        with patch.object(artifact_engine, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            with pytest.raises(RuntimeError, match="after 3 attempts"):
                asyncio.run(generate_worksheet_latex(_request()))
        assert client.aio.models.generate_content.await_count == 3

    def test_transient_error_is_retried(self):
        """A failed first attempt is followed by a successful retry."""
        good = MagicMock(text="\\begin{enumerate}\\item A\\end{enumerate}")
        client = _mock_client(side_effect=[RuntimeError("boom"), good])
        with patch.object(artifact_engine, "get_client", return_value=client), \
             patch("asyncio.sleep", new=AsyncMock()):
            latex = asyncio.run(generate_worksheet_latex(_request()))
        assert "\\item A" in latex

    def test_rate_limit_errors_back_off_exponentially(self):
        """429 responses back off with doubling delays."""
        client = _mock_client(side_effect=RuntimeError("429 ResourceExhausted"))
        sleep_mock = AsyncMock()
        with patch.object(artifact_engine, "get_client", return_value=client), \
             patch("asyncio.sleep", new=sleep_mock):
            with pytest.raises(RuntimeError):
                asyncio.run(generate_worksheet_latex(_request()))
        assert [call.args[0] for call in sleep_mock.await_args_list] == [2, 4, 8]


# ===========================================================================
# PDF compilation
# ===========================================================================

class TestCompileLatexToPdf:
    """compile_latex_to_pdf shells out to pdflatex and validates the result."""

    def test_writes_tex_file_and_returns_pdf_path(self, tmp_path):
        """The source is written to disk and the produced PDF path returned."""
        def fake_run(*args, **kwargs):
            (tmp_path / "worksheet.pdf").write_bytes(b"%PDF-1.4")
            return MagicMock(returncode=0, stderr="")

        with patch("shutil.which", return_value="/usr/bin/pdflatex"), \
             patch("subprocess.run", side_effect=fake_run) as run_mock:
            pdf_path = compile_latex_to_pdf("\\begin{enumerate}\\item A\\end{enumerate}", str(tmp_path))

        assert pdf_path == os.path.join(str(tmp_path), "worksheet.pdf")
        assert (tmp_path / "worksheet.tex").read_text() == "\\begin{enumerate}\\item A\\end{enumerate}"
        assert run_mock.call_count == 2, "pdflatex runs twice to resolve references"

    def test_missing_pdflatex_raises(self, tmp_path):
        """A helpful error is raised when pdflatex cannot be located."""
        with patch("shutil.which", return_value=None), \
             patch("os.path.exists", return_value=False):
            with pytest.raises(RuntimeError, match="pdflatex is not installed"):
                compile_latex_to_pdf("\\begin{enumerate}\\end{enumerate}", str(tmp_path))

    def test_falls_back_to_a_known_pdflatex_path(self, tmp_path):
        """When pdflatex is off PATH, common install locations are probed."""
        def fake_run(cmd, **kwargs):
            (tmp_path / "worksheet.pdf").write_bytes(b"%PDF-1.4")
            assert cmd[0] == "/usr/bin/pdflatex"
            return MagicMock(returncode=0, stderr="")

        with patch("shutil.which", return_value=None), \
             patch("os.path.exists", lambda p: p == "/usr/bin/pdflatex" or p.endswith("worksheet.pdf")), \
             patch("os.access", return_value=True), \
             patch("subprocess.run", side_effect=fake_run):
            assert compile_latex_to_pdf("\\begin{enumerate}\\end{enumerate}", str(tmp_path)).endswith("worksheet.pdf")

    def test_compilation_failure_includes_log_tail(self, tmp_path):
        """A non-zero exit on the second pass surfaces the log tail."""
        (tmp_path / "worksheet.log").write_text("! Undefined control sequence.\n")
        with patch("shutil.which", return_value="/usr/bin/pdflatex"), \
             patch("subprocess.run", return_value=MagicMock(returncode=1, stderr="fatal")):
            with pytest.raises(RuntimeError, match="Undefined control sequence"):
                compile_latex_to_pdf("\\begin{enumerate}\\end{enumerate}", str(tmp_path))

    def test_missing_pdf_after_success_raises(self, tmp_path):
        """A clean exit without a PDF on disk is still an error."""
        with patch("shutil.which", return_value="/usr/bin/pdflatex"), \
             patch("subprocess.run", return_value=MagicMock(returncode=0, stderr="")):
            with pytest.raises(RuntimeError, match="worksheet.pdf was not created"):
                compile_latex_to_pdf("\\begin{enumerate}\\end{enumerate}", str(tmp_path))


class TestGenerateWorksheetPdf:
    """The end-to-end pipeline falls back when generation or compilation fails."""

    def test_happy_path_returns_compiled_pdf(self):
        """Generated LaTeX is compiled and its path returned."""
        with patch.object(artifact_engine, "generate_worksheet_latex",
                          new=AsyncMock(return_value="\\begin{enumerate}\\item A\\end{enumerate}")), \
             patch.object(artifact_engine, "compile_latex_to_pdf",
                          return_value="/tmp/out/worksheet.pdf") as compile_mock:
            assert asyncio.run(generate_worksheet_pdf(_request())) == "/tmp/out/worksheet.pdf"
        assert "\\item A" in compile_mock.call_args.args[0]

    def test_generation_failure_compiles_the_fallback_template(self):
        """When Gemini fails entirely the fallback template is compiled."""
        with patch.object(artifact_engine, "generate_worksheet_latex",
                          new=AsyncMock(side_effect=RuntimeError("gemini down"))), \
             patch.object(artifact_engine, "compile_latex_to_pdf",
                          return_value="/tmp/out/worksheet.pdf") as compile_mock:
            assert asyncio.run(generate_worksheet_pdf(_request())) == "/tmp/out/worksheet.pdf"
        assert "failed to compile properly" in compile_mock.call_args.args[0]

    def test_compile_failure_retries_with_the_fallback_template(self):
        """A failed first compile triggers a fallback compile in a new directory."""
        with patch.object(artifact_engine, "generate_worksheet_latex",
                          new=AsyncMock(return_value="\\begin{enumerate}\\item A\\end{enumerate}")), \
             patch.object(artifact_engine, "compile_latex_to_pdf",
                          side_effect=[RuntimeError("bad latex"), "/tmp/fallback/worksheet.pdf"]) as compile_mock:
            assert asyncio.run(generate_worksheet_pdf(_request())) == "/tmp/fallback/worksheet.pdf"
        assert compile_mock.call_count == 2
        assert "failed to compile properly" in compile_mock.call_args_list[1].args[0]

    def test_both_compiles_failing_raises(self):
        """If even the fallback cannot compile, the caller gets a RuntimeError."""
        with patch.object(artifact_engine, "generate_worksheet_latex",
                          new=AsyncMock(return_value="\\begin{enumerate}\\item A\\end{enumerate}")), \
             patch.object(artifact_engine, "compile_latex_to_pdf",
                          side_effect=RuntimeError("no pdflatex")):
            with pytest.raises(RuntimeError, match="both generated and fallback templates"):
                asyncio.run(generate_worksheet_pdf(_request()))
