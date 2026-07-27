"""
Tests for the LaTeX decomposer, which splits a monolithic Gemini
`\\begin{enumerate}` block into individual canvas elements.
"""
import pytest

from app.services.latex_decomposer import parse_monolithic_latex


def _kinds(elements):
    return [e["kind"] for e in elements]


def _questions(elements):
    return [e for e in elements if e["kind"] == "question"]


# ===========================================================================
# Scaffolding elements (preamble / header / footer)
# ===========================================================================

class TestScaffolding:
    """Every decomposition emits a locked preamble, header and footer."""

    def test_preamble_and_header_always_present(self):
        """The first two elements are always the preamble and the header."""
        elements = parse_monolithic_latex("\\begin{enumerate}\\item Solve $x+1=2$.\\end{enumerate}")
        assert elements[0]["kind"] == "preamble"
        assert elements[0]["is_locked"] is True
        assert elements[0]["sort_key"] == "a0"
        assert elements[1]["kind"] == "header"
        assert elements[1]["is_locked"] is False
        assert elements[1]["sort_key"] == "a1"

    def test_title_is_injected_into_preamble_and_header(self):
        """The supplied title appears in both the fancyhdr line and the centred header."""
        elements = parse_monolithic_latex(
            "\\begin{enumerate}\\item Q\\end{enumerate}",
            title="Calculus Drill",
        )
        assert "Calculus Drill" in elements[0]["content_latex"]
        assert "Calculus Drill" in elements[1]["content_latex"]

    def test_default_title_is_worksheet(self):
        """Omitting the title falls back to 'Worksheet'."""
        elements = parse_monolithic_latex("\\begin{enumerate}\\item Q\\end{enumerate}")
        assert "Worksheet" in elements[1]["content_latex"]

    def test_footer_closes_the_document(self):
        """The final element is a locked footer that ends the LaTeX document."""
        elements = parse_monolithic_latex("\\begin{enumerate}\\item Q\\end{enumerate}")
        footer = elements[-1]
        assert footer["kind"] == "footer"
        assert footer["is_locked"] is True
        assert footer["sort_key"] == "a3"
        assert "\\end{document}" in footer["content_latex"]

    def test_enumerate_wrappers_become_locked_text_blocks(self):
        """The enumerate open/close tags are emitted as locked text blocks."""
        elements = parse_monolithic_latex("\\begin{enumerate}\\item Q\\end{enumerate}")
        text_blocks = [e for e in elements if e["kind"] == "text_block"]
        assert [b["content_latex"] for b in text_blocks] == [
            "\\begin{enumerate}",
            "\\end{enumerate}",
        ]
        assert all(b["is_locked"] for b in text_blocks)


# ===========================================================================
# Item splitting
# ===========================================================================

class TestItemSplitting:
    """Top-level \\item entries each become their own question element."""

    def test_splits_multiple_items(self):
        """Three top-level items produce three question elements."""
        raw = (
            "\\begin{enumerate}\n"
            "\\item Differentiate $x^2$.\n"
            "\\item Integrate $2x$.\n"
            "\\item Solve $x^2 = 4$.\n"
            "\\end{enumerate}"
        )
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 3
        assert "Differentiate" in questions[0]["content_latex"]
        assert "Integrate" in questions[1]["content_latex"]
        assert "Solve" in questions[2]["content_latex"]

    def test_question_labels_and_sort_keys_are_sequential(self):
        """Questions are labelled and sorted in document order."""
        raw = "\\begin{enumerate}\\item A\\item B\\end{enumerate}"
        questions = _questions(parse_monolithic_latex(raw))
        assert [q["label"] for q in questions] == ["Question 1", "Question 2"]
        assert [q["sort_key"] for q in questions] == ["a2_b_000", "a2_b_001"]

    def test_questions_are_editable(self):
        """Question elements are neither locked nor collapsed."""
        questions = _questions(parse_monolithic_latex("\\begin{enumerate}\\item A\\end{enumerate}"))
        assert questions[0]["is_locked"] is False
        assert questions[0]["is_collapsed"] is False

    def test_nested_items_stay_with_their_parent(self):
        """\\item inside a nested environment does not create a new element."""
        raw = (
            "\\begin{enumerate}\n"
            "\\item Multipart question:\n"
            "  \\begin{itemize}\n"
            "    \\item first part\n"
            "    \\item second part\n"
            "  \\end{itemize}\n"
            "\\item Standalone question\n"
            "\\end{enumerate}"
        )
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2
        assert "first part" in questions[0]["content_latex"]
        assert "second part" in questions[0]["content_latex"]
        assert "Standalone question" in questions[1]["content_latex"]

    @pytest.mark.xfail(
        reason="Known limitation: the non-greedy enumerate regex stops at the first "
               "nested \\end{enumerate}, discarding every item after a nested list.",
        strict=True,
    )
    def test_nested_enumerate_does_not_truncate_the_list(self):
        """A nested enumerate should not swallow the questions that follow it."""
        raw = (
            "\\begin{enumerate}\n"
            "\\item Multipart question:\n"
            "  \\begin{enumerate}\n"
            "    \\item first part\n"
            "  \\end{enumerate}\n"
            "\\item Standalone question\n"
            "\\end{enumerate}"
        )
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2
        assert "Standalone question" in questions[1]["content_latex"]

    def test_tikz_environment_kept_intact(self):
        """A tikzpicture block remains inside the question that owns it."""
        raw = (
            "\\begin{enumerate}\n"
            "\\item Sketch the curve.\n"
            "\\begin{center}\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}\\end{center}\n"
            "\\item Next question\n"
            "\\end{enumerate}"
        )
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2
        assert "tikzpicture" in questions[0]["content_latex"]

    def test_optional_item_argument_is_preserved(self):
        """An \\item[label] optional argument is kept with its question."""
        raw = "\\begin{enumerate}\\item[(a)] First\\item[(b)] Second\\end{enumerate}"
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2

    def test_content_before_first_item_becomes_its_own_element(self):
        """Preamble text inside the list is emitted before the first question."""
        raw = "\\begin{enumerate}\nInstructions here.\n\\item A\n\\end{enumerate}"
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2
        assert "Instructions here." in questions[0]["content_latex"]

    def test_whitespace_only_items_are_dropped(self):
        """Blank segments between items do not become elements."""
        raw = "\\begin{enumerate}\n\n\\item A\n\n\\end{enumerate}"
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 1


# ===========================================================================
# Labels
# ===========================================================================

class TestElementOrdering:
    """Sort keys order preamble, header, list, questions and footer."""

    def test_sort_keys_are_monotonic(self):
        """Sort keys are already in ascending order as emitted."""
        raw = "\\begin{enumerate}\\item A\\item B\\end{enumerate}"
        keys = [e["sort_key"] for e in parse_monolithic_latex(raw)]
        assert keys == sorted(keys)

    def test_element_sequence(self):
        """Element kinds follow the canonical worksheet layout."""
        raw = "\\begin{enumerate}\\item A\\end{enumerate}"
        assert _kinds(parse_monolithic_latex(raw)) == [
            "preamble",
            "header",
            "text_block",
            "question",
            "text_block",
            "footer",
        ]


# ===========================================================================
# Malformed input
# ===========================================================================

class TestMalformedInput:
    """Input without an enumerate block degrades to a single question block."""

    def test_missing_enumerate_block_produces_single_dump(self):
        """Raw content without enumerate wrappers is emitted as one block."""
        elements = parse_monolithic_latex("Just some raw text about limits.")
        assert _kinds(elements) == ["preamble", "header", "question"]
        dumped = elements[-1]
        assert dumped["content_latex"] == "Just some raw text about limits."
        assert dumped["label"] == "Questions"
        assert dumped["sort_key"] == "a2_0_invalid"

    def test_empty_input_produces_no_question(self):
        """Empty input yields only the preamble and header plus an empty dump."""
        elements = parse_monolithic_latex("")
        assert _kinds(elements) == ["preamble", "header", "question"]
        assert elements[-1]["content_latex"] == ""

    def test_windows_line_endings_are_normalized(self):
        """CRLF input is normalised before splitting."""
        raw = "\\begin{enumerate}\r\n\\item A\r\n\\item B\r\n\\end{enumerate}"
        questions = _questions(parse_monolithic_latex(raw))
        assert len(questions) == 2
        assert "\r" not in questions[0]["content_latex"]

    def test_empty_enumerate_block_yields_no_questions(self):
        """An enumerate block with no items produces no question elements."""
        elements = parse_monolithic_latex("\\begin{enumerate}\\end{enumerate}")
        assert _questions(elements) == []
        assert _kinds(elements) == ["preamble", "header", "text_block", "text_block", "footer"]
