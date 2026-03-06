"""
Artifact Generation Engine (A.G.E.)
====================================
Generates NESA-styled printable PDF maths worksheets using Gemini + LaTeX.

Pipeline:
  1. Accept WorksheetRequest (topic, year_level, num_questions, difficulty)
  2. Call Gemini to generate LaTeX worksheet content
  3. Compile LaTeX to PDF via pdflatex
  4. Return the PDF file path

Follows the same async + lazy-loading Gemini pattern as gemini_client.py.
"""

import asyncio
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .gemini_client import get_client, MODEL_ID


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    MIXED = "mixed"


class WorksheetRequest(BaseModel):
    """Request payload for worksheet generation."""
    topic: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Maths topic aligned to NSW HSC syllabus, e.g. 'Differentiation'",
    )
    year_level: int = Field(
        default=11,
        ge=7,
        le=12,
        description="NSW year level (7-12)",
    )
    num_questions: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Number of questions to generate",
    )
    difficulty: Difficulty = Field(
        default=Difficulty.MIXED,
        description="Difficulty level: easy, medium, hard, or mixed (progressive)",
    )
    include_answers: bool = Field(
        default=True,
        description="Whether to include an answer key section",
    )
    student_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional student name printed on the worksheet header",
    )


# ---------------------------------------------------------------------------
# NSW HSC Syllabus topic catalogue
# ---------------------------------------------------------------------------

SYLLABUS_TOPICS: Dict[int, List[Dict[str, str]]] = {
    7: [
        {"id": "num-7-1", "name": "Whole Numbers and Place Value", "strand": "Number & Algebra"},
        {"id": "num-7-2", "name": "Fractions, Decimals and Percentages", "strand": "Number & Algebra"},
        {"id": "num-7-3", "name": "Integers", "strand": "Number & Algebra"},
        {"id": "alg-7-1", "name": "Introduction to Variables", "strand": "Number & Algebra"},
        {"id": "alg-7-2", "name": "Simple Linear Equations", "strand": "Number & Algebra"},
        {"id": "geo-7-1", "name": "Angles and Lines", "strand": "Measurement & Geometry"},
        {"id": "geo-7-2", "name": "Area and Perimeter", "strand": "Measurement & Geometry"},
        {"id": "sta-7-1", "name": "Data Collection and Representation", "strand": "Statistics & Probability"},
        {"id": "sta-7-2", "name": "Probability Basics", "strand": "Statistics & Probability"},
    ],
    8: [
        {"id": "num-8-1", "name": "Ratios and Rates", "strand": "Number & Algebra"},
        {"id": "num-8-2", "name": "Index Notation", "strand": "Number & Algebra"},
        {"id": "alg-8-1", "name": "Algebraic Expressions", "strand": "Number & Algebra"},
        {"id": "alg-8-2", "name": "Linear Equations", "strand": "Number & Algebra"},
        {"id": "alg-8-3", "name": "Linear Relationships and Graphing", "strand": "Number & Algebra"},
        {"id": "geo-8-1", "name": "Properties of Triangles and Quadrilaterals", "strand": "Measurement & Geometry"},
        {"id": "geo-8-2", "name": "Circles: Circumference and Area", "strand": "Measurement & Geometry"},
        {"id": "sta-8-1", "name": "Mean, Median, Mode and Range", "strand": "Statistics & Probability"},
        {"id": "sta-8-2", "name": "Probability with Two-Step Experiments", "strand": "Statistics & Probability"},
    ],
    9: [
        {"id": "num-9-1", "name": "Surds and Irrational Numbers", "strand": "Number & Algebra"},
        {"id": "alg-9-1", "name": "Expanding and Factorising", "strand": "Number & Algebra"},
        {"id": "alg-9-2", "name": "Simultaneous Equations", "strand": "Number & Algebra"},
        {"id": "alg-9-3", "name": "Index Laws", "strand": "Number & Algebra"},
        {"id": "geo-9-1", "name": "Trigonometry (Right-Angled Triangles)", "strand": "Measurement & Geometry"},
        {"id": "geo-9-2", "name": "Surface Area and Volume", "strand": "Measurement & Geometry"},
        {"id": "sta-9-1", "name": "Histograms and Frequency Tables", "strand": "Statistics & Probability"},
        {"id": "sta-9-2", "name": "Relative Frequency and Probability", "strand": "Statistics & Probability"},
    ],
    10: [
        {"id": "alg-10-1", "name": "Quadratic Equations", "strand": "Number & Algebra"},
        {"id": "alg-10-2", "name": "Polynomials", "strand": "Number & Algebra"},
        {"id": "alg-10-3", "name": "Logarithms", "strand": "Number & Algebra"},
        {"id": "fun-10-1", "name": "Functions and Relations", "strand": "Number & Algebra"},
        {"id": "geo-10-1", "name": "Non-Right-Angled Trigonometry (Sine/Cosine Rule)", "strand": "Measurement & Geometry"},
        {"id": "geo-10-2", "name": "Coordinate Geometry", "strand": "Measurement & Geometry"},
        {"id": "sta-10-1", "name": "Bivariate Data Analysis", "strand": "Statistics & Probability"},
        {"id": "sta-10-2", "name": "Cumulative Frequency and Box Plots", "strand": "Statistics & Probability"},
    ],
    11: [
        {"id": "fun-11-1", "name": "Functions and Graphing", "strand": "Functions"},
        {"id": "fun-11-2", "name": "Exponential and Logarithmic Functions", "strand": "Functions"},
        {"id": "trig-11-1", "name": "Trigonometric Functions", "strand": "Trigonometry"},
        {"id": "trig-11-2", "name": "Trigonometric Identities", "strand": "Trigonometry"},
        {"id": "calc-11-1", "name": "Introduction to Differentiation", "strand": "Calculus"},
        {"id": "calc-11-2", "name": "Applications of Differentiation", "strand": "Calculus"},
        {"id": "stat-11-1", "name": "Descriptive Statistics", "strand": "Statistical Analysis"},
        {"id": "stat-11-2", "name": "Probability (Discrete Random Variables)", "strand": "Statistical Analysis"},
        {"id": "comb-11-1", "name": "Combinatorics (Ext 1)", "strand": "Extension 1"},
        {"id": "poly-11-1", "name": "Polynomials (Ext 1)", "strand": "Extension 1"},
        {"id": "vec-11-1", "name": "Vectors in 2D (Ext 1)", "strand": "Extension 1"},
    ],
    12: [
        {"id": "calc-12-1", "name": "Differential Calculus (Advanced)", "strand": "Calculus"},
        {"id": "calc-12-2", "name": "Integral Calculus", "strand": "Calculus"},
        {"id": "calc-12-3", "name": "Applications of Integration", "strand": "Calculus"},
        {"id": "trig-12-1", "name": "Trigonometric Equations", "strand": "Trigonometry"},
        {"id": "fin-12-1", "name": "Financial Mathematics", "strand": "Financial"},
        {"id": "stat-12-1", "name": "Continuous Probability Distributions", "strand": "Statistical Analysis"},
        {"id": "stat-12-2", "name": "The Normal Distribution", "strand": "Statistical Analysis"},
        {"id": "calc-12-4", "name": "Differential Equations (Ext 1)", "strand": "Extension 1"},
        {"id": "vec-12-1", "name": "Vectors in 3D (Ext 1)", "strand": "Extension 1"},
        {"id": "proof-12-1", "name": "Proof by Mathematical Induction (Ext 1)", "strand": "Extension 1"},
        {"id": "cplx-12-1", "name": "Complex Numbers (Ext 2)", "strand": "Extension 2"},
        {"id": "mech-12-1", "name": "Mechanics (Ext 2)", "strand": "Extension 2"},
        {"id": "int-12-1", "name": "Integration Techniques (Ext 2)", "strand": "Extension 2"},
    ],
}


def get_topics_for_year(year_level: int) -> List[Dict[str, str]]:
    """Return the available topics for a given NSW year level."""
    return SYLLABUS_TOPICS.get(year_level, [])


def get_all_topics() -> Dict[int, List[Dict[str, str]]]:
    """Return the full topic catalogue keyed by year level."""
    return SYLLABUS_TOPICS


# ---------------------------------------------------------------------------
# Gemini system prompt for LaTeX worksheet generation
# ---------------------------------------------------------------------------

WORKSHEET_SYSTEM_PROMPT = r"""You are a LaTeX worksheet generator for the NSW HSC Mathematics syllabus (NESA).
Your ONLY output must be a COMPLETE, COMPILABLE LaTeX document. Do NOT output any commentary,
explanation, markdown fences, or anything other than pure LaTeX source code.

RULES:
1. The document MUST begin with \documentclass and end with \end{document}.
2. Use the article document class with A4 paper: \documentclass[a4paper,12pt]{article}
3. Use these packages ONLY (do not add others):
   - amsmath, amssymb, amsthm (for maths)
   - geometry (for margins)
   - enumitem (for lists)
   - fancyhdr (for header/footer)
   - lastpage (for page count)
   - tikz (ONLY if a geometry diagram is absolutely required)
4. ALL mathematical expressions must use proper LaTeX:
   - Fractions: \frac{a}{b}
   - Limits: \lim_{x \to a}
   - Integrals: \int_{a}^{b}
   - Derivatives: \frac{d}{dx}, \frac{dy}{dx}
   - Square roots: \sqrt{x}, \sqrt[n]{x}
   - Greek letters: \alpha, \beta, \theta, \pi
   - Trig: \sin, \cos, \tan, \ln, \log
5. Questions MUST progress in difficulty from easy to hard.
6. Each question must be numbered and clearly separated.
7. If an answer key is requested, place it on a NEW PAGE after the questions
   under the heading "Answer Key". Provide concise worked solutions.
8. Do NOT use any undefined commands or environments.
9. Do NOT use the \boldsymbol command. Use \mathbf instead if bold maths is needed.
10. Do NOT use \usepackage{parskip}. Set \parindent and \parskip manually if needed.
11. IMPORTANT: Never use \displaystyle inside sub/superscripts.
12. Make sure every \begin has a matching \end.
13. Escape percent signs as \% in text.

FORMATTING REQUIREMENTS:
- Clean, professional layout suitable for printing
- Header: "NSW Mathematics Worksheet" on the left, topic on the right
- Footer: "Page X of Y" centred
- Clear spacing between questions (use \vspace{12pt} between items)
- Each question worth equal marks; display marks in brackets e.g. [2 marks]
"""


def _build_user_prompt(request: WorksheetRequest) -> str:
    """Construct the user prompt that tells Gemini what worksheet to generate."""
    difficulty_guidance = {
        Difficulty.EASY: "All questions should be straightforward, testing basic recall and direct application.",
        Difficulty.MEDIUM: "Questions should require multi-step reasoning and moderate algebraic manipulation.",
        Difficulty.HARD: "Questions should be challenging, requiring synthesis of multiple concepts, suitable for exam preparation.",
        Difficulty.MIXED: (
            "Questions MUST progress in difficulty: start with basic recall, "
            "move to multi-step application, and finish with challenging exam-style questions."
        ),
    }

    answer_instruction = (
        "Include a FULL Answer Key on a new page with worked solutions for every question."
        if request.include_answers
        else "Do NOT include an answer key."
    )

    student_line = (
        f"Include a line in the header for the student name pre-filled as: {request.student_name}"
        if request.student_name
        else "Include a blank line in the header: Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_"
    )

    return (
        f"Generate a complete LaTeX worksheet with the following specifications:\n"
        f"- Topic: {request.topic}\n"
        f"- NSW Year Level: {request.year_level}\n"
        f"- Number of questions: {request.num_questions}\n"
        f"- Difficulty: {request.difficulty.value}\n"
        f"  Guidance: {difficulty_guidance[request.difficulty]}\n"
        f"- {answer_instruction}\n"
        f"- {student_line}\n"
        f"\nRemember: output ONLY the LaTeX source code, nothing else."
    )


# ---------------------------------------------------------------------------
# LaTeX fallback template (used when Gemini output cannot be compiled)
# ---------------------------------------------------------------------------

FALLBACK_LATEX_TEMPLATE = r"""\documentclass[a4paper,12pt]{article}
\usepackage{amsmath,amssymb}
\usepackage[margin=2.5cm]{geometry}
\usepackage{fancyhdr}
\usepackage{lastpage}
\usepackage{enumitem}

\pagestyle{fancy}
\fancyhf{}
\lhead{NSW Mathematics Worksheet}
\rhead{%(topic)s}
\cfoot{Page \thepage\ of \pageref{LastPage}}
\renewcommand{\headrulewidth}{0.4pt}

\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}

\begin{document}

\begin{center}
{\Large\bfseries NSW Mathematics Worksheet}\\[6pt]
{\large %(topic)s --- Year %(year_level)s}\\[4pt]
Name: \rule{6cm}{0.4pt} \hfill Date: \rule{3cm}{0.4pt}
\end{center}

\vspace{12pt}
\hrule
\vspace{12pt}

\textbf{Note:} The AI-generated content could not be compiled.
Please try generating the worksheet again.

\end{document}
"""


# ---------------------------------------------------------------------------
# Core engine functions
# ---------------------------------------------------------------------------

def _extract_latex(raw: str) -> str:
    """
    Extract pure LaTeX from Gemini output.
    Strips markdown code fences and any preamble/postscript text.
    """
    # Remove markdown code fences if present
    # Handle ```latex ... ``` or ```tex ... ``` or ``` ... ```
    fence_pattern = r"```(?:latex|tex)?\s*\n?(.*?)```"
    match = re.search(fence_pattern, raw, re.DOTALL)
    if match:
        raw = match.group(1)

    # Find \documentclass ... \end{document} span
    doc_start = raw.find(r"\documentclass")
    doc_end = raw.rfind(r"\end{document}")
    if doc_start != -1 and doc_end != -1:
        raw = raw[doc_start:doc_end + len(r"\end{document}")]

    return raw.strip()


def _sanitize_latex(latex: str) -> str:
    """
    Apply safety fixes to common LaTeX issues that prevent compilation.
    """
    # Replace \boldsymbol with \mathbf (common Gemini mistake)
    latex = latex.replace(r"\boldsymbol", r"\mathbf")

    # Remove \usepackage{parskip} if Gemini sneaked it in
    latex = re.sub(r"\\usepackage(\[.*?\])?\{parskip\}", "", latex)

    # Remove any \usepackage that is not in our allowed list
    allowed_packages = {
        "amsmath", "amssymb", "amsthm", "geometry", "enumitem",
        "fancyhdr", "lastpage", "tikz", "pgfplots",
    }
    def _filter_usepackage(m: re.Match) -> str:
        pkg = m.group(2)
        # Handle comma-separated packages
        pkgs = [p.strip() for p in pkg.split(",")]
        kept = [p for p in pkgs if p in allowed_packages]
        if not kept:
            return ""
        options = m.group(1) or ""
        return f"\\usepackage{options}{{{','.join(kept)}}}"

    latex = re.sub(
        r"\\usepackage(\[.*?\])?\{([^}]+)\}",
        _filter_usepackage,
        latex,
    )

    return latex


async def generate_worksheet_latex(request: WorksheetRequest) -> str:
    """
    Call Gemini to generate LaTeX source for a maths worksheet.

    Returns the raw LaTeX string. Raises RuntimeError on failure.
    """
    from google.genai import types

    system_prompt = WORKSHEET_SYSTEM_PROMPT
    user_prompt = _build_user_prompt(request)

    config = types.GenerateContentConfig(
        temperature=0.4,  # Lower temp for more deterministic LaTeX
        max_output_tokens=8192,
        system_instruction=system_prompt,
    )

    max_retries = 3
    base_delay = 2
    last_error: Optional[Exception] = None

    for attempt in range(max_retries):
        try:
            client_instance = get_client()
            response = await asyncio.wait_for(
                client_instance.aio.models.generate_content(
                    model=MODEL_ID,
                    contents=user_prompt,
                    config=config,
                ),
                timeout=60.0,  # Longer timeout for LaTeX generation
            )

            raw_text = response.text.strip()
            print(f"[A.G.E.] Gemini returned {len(raw_text)} chars (attempt {attempt + 1})")

            latex_source = _extract_latex(raw_text)
            latex_source = _sanitize_latex(latex_source)

            if r"\documentclass" not in latex_source:
                raise ValueError("Gemini response did not contain a valid LaTeX document.")

            return latex_source

        except asyncio.TimeoutError:
            last_error = TimeoutError(f"Gemini API timed out (attempt {attempt + 1}/{max_retries})")
            print(f"[A.G.E.] {last_error}")

        except Exception as e:
            last_error = e
            print(f"[A.G.E.] Gemini error (attempt {attempt + 1}): {e}")
            if "429" in str(e) or "ResourceExhausted" in str(e):
                await asyncio.sleep(base_delay * (2 ** attempt))
            else:
                await asyncio.sleep(1)

    raise RuntimeError(f"Failed to generate LaTeX after {max_retries} attempts: {last_error}")


def compile_latex_to_pdf(latex_source: str, output_dir: str) -> str:
    """
    Write *latex_source* to a .tex file inside *output_dir* and compile it
    with pdflatex. Returns the path to the resulting PDF.

    Raises RuntimeError if compilation fails.
    """
    tex_filename = "worksheet.tex"
    tex_path = os.path.join(output_dir, tex_filename)

    # Write LaTeX source
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(latex_source)

    # Check for pdflatex availability
    pdflatex_path = shutil.which("pdflatex")
    if pdflatex_path is None:
        raise RuntimeError(
            "pdflatex is not installed or not on PATH. "
            "Install texlive-latex-base (e.g. apt-get install texlive-latex-recommended texlive-fonts-recommended texlive-latex-extra)."
        )

    # Compile twice (for page references like lastpage)
    for pass_num in (1, 2):
        result = subprocess.run(
            [
                pdflatex_path,
                "-interaction=nonstopmode",
                "-halt-on-error",
                "-output-directory", output_dir,
                tex_path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=output_dir,
        )

        if result.returncode != 0 and pass_num == 2:
            # Grab the last 40 lines of the log for debugging
            log_path = os.path.join(output_dir, "worksheet.log")
            log_tail = ""
            if os.path.exists(log_path):
                with open(log_path, "r", encoding="utf-8", errors="replace") as lf:
                    lines = lf.readlines()
                    log_tail = "".join(lines[-40:])

            raise RuntimeError(
                f"pdflatex compilation failed (pass {pass_num}).\n"
                f"--- LOG TAIL ---\n{log_tail}\n"
                f"--- STDERR ---\n{result.stderr[-500:] if result.stderr else '(empty)'}"
            )

    pdf_path = os.path.join(output_dir, "worksheet.pdf")
    if not os.path.exists(pdf_path):
        raise RuntimeError("pdflatex completed but worksheet.pdf was not created.")

    return pdf_path


async def generate_worksheet_pdf(request: WorksheetRequest) -> str:
    """
    End-to-end pipeline: Gemini -> LaTeX -> PDF.

    Returns the absolute path to the generated PDF file (in a temp directory).
    The caller is responsible for cleaning up or serving the file.
    """
    # Create a unique temp directory for this worksheet
    output_dir = tempfile.mkdtemp(prefix="mait_worksheet_")
    print(f"[A.G.E.] Working directory: {output_dir}")

    try:
        # Step 1: Generate LaTeX via Gemini
        latex_source = await generate_worksheet_latex(request)
    except RuntimeError as e:
        # Gemini failed entirely -- use the fallback template
        print(f"[A.G.E.] Gemini generation failed, using fallback template: {e}")
        latex_source = FALLBACK_LATEX_TEMPLATE % {
            "topic": request.topic.replace("&", r"\&"),
            "year_level": request.year_level,
        }

    try:
        # Step 2: Compile LaTeX to PDF
        pdf_path = compile_latex_to_pdf(latex_source, output_dir)
    except RuntimeError as first_compile_error:
        # Compilation failed -- try fallback template
        print(f"[A.G.E.] First compilation failed: {first_compile_error}")
        print("[A.G.E.] Attempting fallback template...")

        fallback_dir = tempfile.mkdtemp(prefix="mait_worksheet_fallback_")
        fallback_source = FALLBACK_LATEX_TEMPLATE % {
            "topic": request.topic.replace("&", r"\&"),
            "year_level": request.year_level,
        }
        try:
            pdf_path = compile_latex_to_pdf(fallback_source, fallback_dir)
            # Clean up the original failed directory
            shutil.rmtree(output_dir, ignore_errors=True)
        except RuntimeError:
            # Even fallback failed (pdflatex not installed, etc.)
            shutil.rmtree(fallback_dir, ignore_errors=True)
            shutil.rmtree(output_dir, ignore_errors=True)
            raise RuntimeError(
                f"LaTeX compilation failed for both generated and fallback templates. "
                f"Original error: {first_compile_error}"
            )

    print(f"[A.G.E.] PDF generated: {pdf_path}")
    return pdf_path
