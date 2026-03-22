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

class WorksheetSettings(BaseModel):
    course: str
    subject: str
    difficulty: str
    numberOfQuestions: int
    headerSpaces: str
    workingSpace: str
    marks: str
    answerKey: str
    watermark: bool
    mode: str

class SyllabusPacket(BaseModel):
    topicSummary: str
    outcomes: List[str]
    dotPoints: List[str]
    include: List[str]
    exclude: List[str]
    assessmentEmphasis: List[str]
    questionStyleNotes: List[str]

class LegacyFields(BaseModel):
    manual_prompt: str = ""
    context_source: str = ""

class WorksheetRequest(BaseModel):
    """Request payload for worksheet generation."""
    requestVersion: str
    worksheetSettings: WorksheetSettings
    topicSummary: str
    syllabusPacket: SyllabusPacket
    pedagogicalDrills: List[str]
    customInstructions: str
    legacyFields: LegacyFields


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

WORKSHEET_SYSTEM_PROMPT = r"""Act as the My AI Tutor Universal Worksheet Generator. Your job is to output a single, raw LaTeX `\begin{enumerate}` ... `\end{enumerate}` block containing the requested educational questions.

You do NOT output text in the chat. You MUST output ONLY the `\begin{enumerate}` environment containing `\item` entries for each question. Do NOT wrap the output in a `\documentclass`, `\begin{document}`, or any preamble. The platform will handle the preamble and footer natively.

# CRITICAL REASONING DIRECTIVE (INTERNAL VERIFICATION)
Before generating the LaTeX, rigorously construct and verify every question and answer internally.
1. Solve the question step-by-step in your scratchpad.
2. Verify using a secondary method (e.g., integrate to check a derivative, check dimensions, test edge cases).
3. If an error or hallucination is found, discard the question and regenerate it.
4. Keep all verification strictly internal. Do NOT leak thinking steps into the final output.

# DYNAMIC TIKZ ENGINE (CROSS-CURRICULAR) — MANDATORY DIAGRAMS
You MUST include at least one TikZ diagram for every 3 questions (e.g. 5 questions → at least 2 diagrams). Diagrams are a core pedagogical feature, not optional decoration.
Figure out the best visual representation based on the subject and topic. You have full autonomy to generate diagrams when they add pedagogical value.
* REQUIRED diagram types (use liberally): Cartesian planes with drawn axes and plotted curves, geometric constructions with labelled angles/sides, vector diagrams, number lines, unit circles, area-under-curve shading, triangles with dimensions, Venn diagrams, tree diagrams, and coordinate geometry figures.
* You CANNOT use pgfplots (\begin{axis}) — it is not installed. Draw ALL graphs manually using vanilla TikZ \draw commands.
* VANILLA TIKZ GRAPH PATTERN (use this for any function graph):
  \begin{tikzpicture}[scale=0.8]
    \draw[->] (-0.3,0) -- (3.5,0) node[right] {$x$};
    \draw[->] (0,-0.3) -- (0,3.5) node[above] {$y$};
    \foreach \x in {1,2,3} { \draw (\x,0.05) -- (\x,-0.05) node[below] {\small$\x$}; }
    \draw[thick,domain=0:3,samples=60] plot (\x, {(\x)^2/3});
    \node[right] at (2.8,2.6) {\small$y=f(x)$};
  \end{tikzpicture}
* You CANNOT generate: Photorealistic images, organic illustrations, or any non-geometric art.
* DIAGRAM PLACEMENT: ALWAYS place diagrams BELOW the question text, NEVER side-by-side. Do NOT use minipages to put text and diagrams next to each other. Use this pattern:
  \item Question text goes here on its own full-width line(s).
  \begin{center}
  \begin{tikzpicture}[scale=0.8]
    ... diagram code ...
  \end{tikzpicture}
  \end{center}
  \par\noindent\hfill\mbox{\textbf{[X Marks]}}
* Available TikZ libraries (already loaded in the preamble): arrows.meta, calc, angles, quotes, patterns, decorations.markings, positioning.
Adapt the complexity to the student's stage (e.g., basic shapes/number lines for primary students, complex slope fields for seniors).

# CURRICULUM SCOPE RULE
The worksheet scope is defined only by the supplied worksheet settings and any supplied SYLLABUS PACKET.
Treat the supplied outcomes, dot-points, inclusions, exclusions, assessment emphasis, and question-style notes as authoritative.
Do NOT rely on any external knowledge base, attached files, or unstated curriculum assumptions.
Do NOT introduce adjacent topics unless they are explicitly requested or strongly implied by the supplied packet.
If no syllabus packet is supplied, generate from the provided topic/settings only and prioritise general correctness over curriculum specificity.

# LATEX QUALITY & LAYOUT CONTROLS
1. Math Syntax: No Unicode math (e.g., use \sqrt{}, not \sqrt{} with unicode char).
2. Environment Integrity: Match all \begin{} and \end{} tags perfectly.
3. Multipart Questions: When generating multipart questions (e.g., Question 1a, 1b), you may use minipages to keep sub-parts together. Do NOT use minipages to place diagrams side-by-side with question text — diagrams always go below.
4. Native Numbering: You MUST output all questions inside a single, standard \begin{enumerate} ... \end{enumerate} environment. Do NOT use custom labels like \item[\textbf{Question 1:}].
5. Marks Placement Rule:
- For short single-line questions, place marks flush-right at the end of the question using:
  \unskip\hfill\mbox{\textbf{[X Marks]}}
- For long questions, wrapped questions, multipart questions, proof-style questions, or questions containing display mathematics, place the marks on a new line directly below the question, flush-right, using:
  \par\noindent\hfill\mbox{\textbf{[X Marks]}}
- Never allow the marks label to wrap across lines.
- Use \mbox{...} around the marks label so it stays unbroken.
6. Dynamic Spacing: Follow the user's prompt. Add ruled lines using \vspace{0.8cm}\noindent\rule{\linewidth}{0.4pt}. Leave \vspace{3cm} for pure math.

# PEDAGOGY & DYNAMIC TOGGLES
The user prompt will provide specific TOGGLES. You must obey them strictly:
* MODE:
  * If PEDAGOGY, weave in MAIT's signature question types: Spot the Error (wrap in \begin{tcolorbox}...\end{tcolorbox}), Parameter Shift, Limit Case Analysis, Proof-Style, and Multi-Step Synthesis.
  * If EXAM STRICT, bypass pedagogical features and output standard exam-style questions only.
"""


def _build_user_prompt(request: WorksheetRequest) -> str:
    """Construct the user prompt that tells Gemini what worksheet to generate."""
    
    settings = request.worksheetSettings
    packet = request.syllabusPacket

    def format_array(label: str, arr: List[str]) -> str:
        return f"- **{label}:** {', '.join(arr)}" if arr else ""

    topic_parts = [p.strip() for p in request.topicSummary.split('|') if p.strip()]
    first_topic = topic_parts[0] if topic_parts else "Mathematics"
    condensed_topic = f"{first_topic} (Mixed)" if len(topic_parts) > 1 else first_topic
    
    header = f"**{settings.course} {condensed_topic} Worksheet**"

    prompt_lines = [
        header,
        "",
        "**USER WORKSHEET REQUEST:**",
        "",
        "**WORKSHEET SETTINGS:**",
        f"- **Course:** {settings.course}",
        f"- **Topic Summary:** {request.topicSummary}",
        f"- **Number of Questions:** {settings.numberOfQuestions}",
        f"- **Difficulty:** {settings.difficulty}",
        f"- **Header Spaces:** {settings.headerSpaces or 'None'}",
        f"- **Working Space:** {settings.workingSpace}",
        f"- **Marks:** {settings.marks}",
        f"- **MODE:** {settings.mode}",
        ""
    ]

    if request.legacyFields.manual_prompt:
        prompt_lines.extend([
            "**MANUAL INSTRUCTIONS:**",
            request.legacyFields.manual_prompt,
            ""
        ])
    else:
        prompt_lines.append("**SYLLABUS PACKET:**")
        
        dot_points_str = format_array("Relevant Dot-Points", packet.dotPoints)
        if dot_points_str: prompt_lines.append(dot_points_str)
        
        outcomes_str = format_array("Outcomes", packet.outcomes)
        if outcomes_str: prompt_lines.append(outcomes_str)
        
        include_str = format_array("Include", packet.include)
        if include_str: prompt_lines.append(include_str)
        
        exclude_str = format_array("Exclude", packet.exclude)
        if exclude_str: prompt_lines.append(exclude_str)
        
        emphasis_str = format_array("Assessment Emphasis", packet.assessmentEmphasis)
        if emphasis_str: prompt_lines.append(emphasis_str)
        
        style_str = format_array("Question Style Notes", packet.questionStyleNotes)
        if style_str: prompt_lines.append(style_str)

        if not any([dot_points_str, outcomes_str, include_str, exclude_str, emphasis_str, style_str]):
            prompt_lines.append("- No direct syllabus map provided.")
        prompt_lines.append("")

    if request.customInstructions:
        prompt_lines.extend([
            "**CUSTOM INSTRUCTIONS:**",
            f"- {request.customInstructions}",
            ""
        ])

    if request.pedagogicalDrills:
        prompt_lines.extend([
            "**PEDAGOGICAL DRILLS REQUESTED:**",
            f"- {', '.join(request.pedagogicalDrills)}",
            ""
        ])

    # Calculate minimum diagram count
    min_diagrams = max(1, settings.numberOfQuestions // 3)
    prompt_lines.extend([
        f"**DIAGRAM REQUIREMENT:** Include vanilla TikZ diagrams (NO pgfplots) in at least {min_diagrams} of the {settings.numberOfQuestions} questions. "
        "Use hand-drawn Cartesian planes (\\draw[->] axes + \\draw[domain=...] plot), geometric figures, unit circles, vector arrows, or area shading as appropriate to the topic. "
        "Place ALL diagrams BELOW the question text using \\begin{center}, NEVER side-by-side in minipages.",
        "",
        "Generate the worksheet strictly from the supplied settings and syllabus packet. Output only the final LaTeX artifact."
    ])

    return "\n".join(prompt_lines)


# ---------------------------------------------------------------------------
# LaTeX fallback template (used when Gemini output cannot be compiled)
# ---------------------------------------------------------------------------

FALLBACK_LATEX_TEMPLATE = r"""\begin{enumerate}
\item \textbf{Note:} The AI-generated content failed to compile properly. Please try generating the worksheet again. \unskip\hfill\mbox{\textbf{[0 Marks]}}
\end{enumerate}
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

    # Find \begin{enumerate} ... \end{enumerate} span
    doc_start = raw.find(r"\begin{enumerate}")
    doc_end = raw.rfind(r"\end{enumerate}")
    if doc_start != -1 and doc_end != -1:
        raw = raw[doc_start:doc_end + len(r"\end{enumerate}")]

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
        "fancyhdr", "lastpage", "tikz", "tcolorbox",
        "graphicx", "multicol", "needspace", "hyphenat", "hyperref"
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

            # Extract and sanitize LaTeX
            latex_source = _sanitize_latex(_extract_latex(raw_text))

            if r"\begin{enumerate}" not in latex_source:
                raise ValueError("Gemini response did not contain a valid LaTeX enumerate block.")

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
        # Fallback to common macOS/Linux TeX paths (useful for non-interactive shells)
        common_paths = [
            "/Library/TeX/texbin/pdflatex",      # MacTeX
            "/opt/homebrew/bin/pdflatex",        # Apple Silicon Homebrew
            "/usr/local/bin/pdflatex",           # Intel Homebrew
            "/usr/bin/pdflatex"                  # Linux / explicit symlink
        ]
        for cp in common_paths:
            if os.path.exists(cp) and os.access(cp, os.X_OK):
                pdflatex_path = cp
                break

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
                "--no-shell-escape",
                "-output-directory", output_dir,
                tex_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
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
            "topic": request.topicSummary.replace("&", r"\&"),
            "year_level": request.worksheetSettings.course,
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
            "topic": request.topicSummary.replace("&", r"\&"),
            "year_level": request.worksheetSettings.course,
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
