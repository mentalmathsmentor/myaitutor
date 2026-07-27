"""Deck → Canvas export (C4 glue, one-way).

Converts a session's generated deck (ExoskeletonResponse parts stored in
sessions.deck) into the Canvas IDE element list, reusing
parse_monolithic_latex so the preamble/header/footer are byte-identical to
the existing worksheet pipeline. No new compile machinery — the client
compiles the assembled elements through the existing /canvas/compile path.

One-way by design (V1 ruling): edits made in Canvas do not sync back to
question_log; only the export event is recorded on the session row.
"""

from __future__ import annotations

import re
from typing import Any

from .latex_decomposer import parse_monolithic_latex

_MD_BOLD = re.compile(r"\*\*(.+?)\*\*", flags=re.DOTALL)
_MD_ITALIC = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", flags=re.DOTALL)
_MD_CODE = re.compile(r"`([^`]+)`")
_MD_HEADING = re.compile(r"^#{1,6}\s*", flags=re.MULTILINE)


def markdown_to_latex(text: str) -> str:
    """Light markdown -> LaTeX for generator output (markdown prose with $math$).

    Deliberately minimal: bold/italic/inline-code/headings. Math delimiters and
    LaTeX commands pass through untouched. The tutor polishes in the IDE."""
    converted = text.replace("\r\n", "\n").strip()
    converted = _MD_BOLD.sub(r"\\textbf{\1}", converted)
    converted = _MD_ITALIC.sub(r"\\textit{\1}", converted)
    converted = _MD_CODE.sub(r"\\texttt{\1}", converted)
    converted = _MD_HEADING.sub("", converted)
    return converted


def _iter_questions(deck: dict[str, Any] | None):
    for part in (deck or {}).get("parts", []):
        if part.get("type") != "question_set":
            continue
        for item in part.get("questions") or []:
            if item.get("question_latex"):
                yield item


def deck_to_canvas_elements(deck: dict[str, Any] | None, title: str) -> tuple[list[dict], int]:
    """Build the Canvas element list from a stored deck.

    Returns (elements, question_count). Raises ValueError when the deck has no
    questions — the caller surfaces that as a 4xx, never a silent empty doc."""
    questions = list(_iter_questions(deck))
    if not questions:
        raise ValueError("Deck has no question items to export")

    item_lines = []
    answer_lines = []
    for index, item in enumerate(questions, start=1):
        question_tex = markdown_to_latex(item["question_latex"])
        marks = item.get("marks")
        marks_suffix = f" \\hfill ({marks} marks)" if isinstance(marks, int) else ""
        item_lines.append(f"\\item {question_tex}{marks_suffix}\n\\vspace{{3cm}}")
        answer = item.get("teacher_answer_latex")
        if answer:
            answer_lines.append(f"\\item {markdown_to_latex(answer)}")

    enumerate_block = "\\begin{enumerate}\n" + "\n\n".join(item_lines) + "\n\\end{enumerate}"
    elements = parse_monolithic_latex(enumerate_block, title)

    if answer_lines:
        answers_block = (
            "\\newpage\n\\section*{Answers (tutor copy — delete this element "
            "before printing the student version)}\n"
            "\\begin{enumerate}\n" + "\n\n".join(answer_lines) + "\n\\end{enumerate}"
        )
        # Between List End (a2_c_end) and Footer (a3) in decomposer sort order.
        elements.insert(
            len(elements) - 1,
            {
                "kind": "text_block",
                "content_latex": answers_block,
                "label": "Answers (tutor copy)",
                "is_locked": False,
                "is_collapsed": True,
                "sort_key": "a2_d_answers",
            },
        )

    return elements, len(questions)
