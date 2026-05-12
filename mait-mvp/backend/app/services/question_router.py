"""
Smart Question Router
=====================
Routes Gemini API calls across three model tiers to balance cost and quality:

  Tier 1 (Text & Math)     → gemini-3.1-flash-lite     (cheapest)
  Tier 2 (Complex Diagrams) → gemini-3.0-flash + thinking (mid-range)
  Tier 3 (Fallback/Regen)   → gemini-3.1-pro + thinking  (premium, user-triggered only)

Output is always strict JSON matching the ModularQuestion schema.
"""

import asyncio
import json
import logging
import os
import re
import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .gemini_client import get_client
from app.logging_config import (
    hash_identifier,
    log_event,
    text_preview,
    usage_metadata_from_response,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model tier definitions
# ---------------------------------------------------------------------------

class ModelTier(str, Enum):
    TEXT_MATH = "tier1"
    COMPLEX_DIAGRAM = "tier2"
    ADVANCED_FALLBACK = "tier3"


TIER_CONFIGS: Dict[ModelTier, Dict[str, Any]] = {
    ModelTier.TEXT_MATH: {
        "model": os.getenv("QUESTION_TIER1_MODEL", "models/gemini-3.1-flash-lite"),
        "thinking": False,
        "thinking_budget": 0,
        "temperature": 0.4,
        "max_output_tokens": 8192,
    },
    ModelTier.COMPLEX_DIAGRAM: {
        "model": os.getenv("QUESTION_TIER2_MODEL", "models/gemini-3.0-flash"),
        "thinking": True,
        "thinking_budget": 1000,
        "temperature": 0.3,
        "max_output_tokens": 8192,
    },
    ModelTier.ADVANCED_FALLBACK: {
        "model": os.getenv("QUESTION_TIER3_MODEL", "models/gemini-3.1-pro"),
        "thinking": True,
        "thinking_budget": 1500,
        "temperature": 0.3,
        "max_output_tokens": 8192,
    },
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ModularQuestion(BaseModel):
    """A single generated question with its solution."""
    id: str
    topic: str
    marks: int
    requires_diagram: bool
    question_latex: str
    teacher_answer_latex: str


class QuestionGenerationRequest(BaseModel):
    """Request to generate modular questions."""
    course: str
    subject: str
    topic_summary: str
    difficulty: str = "Medium"
    num_questions: int = 5
    mode: str = "PEDAGOGY"
    syllabus_outcomes: List[str] = Field(default_factory=list)
    syllabus_dot_points: List[str] = Field(default_factory=list)
    include: List[str] = Field(default_factory=list)
    exclude: List[str] = Field(default_factory=list)
    custom_instructions: str = ""


class RegenerationRequest(BaseModel):
    """Request to regenerate a single question's diagram via Tier 3."""
    original_question_latex: str
    error_feedback: str = ""
    topic: str = ""
    marks: int = 2


# ---------------------------------------------------------------------------
# System prompt (shared across tiers — the JSON schema is enforced here)
# ---------------------------------------------------------------------------

QUESTION_SYSTEM_PROMPT = r"""You are an expert curriculum developer and LaTeX typographer for high school mathematics and sciences. Your task is to generate highly accurate, rigorously tested questions for a modular worksheet compiler.

CRITICAL RULES:
1. DO NOT output \documentclass, preamble, or \begin{document} tags.
2. Coordinate Planning (Internal Monologue): Before writing any TikZ code, you MUST use your thinking scratchpad to explicitly calculate the spatial coordinates, intersections, domains, and ranges.
3. Diagrams: Use \begin{center} \begin{tikzpicture} ... \end{tikzpicture} \end{center}. Scale diagrams to fit a standard A4 column. For graphs, ALWAYS use pgfplots with explicitly defined xmin, xmax, ymin, ymax, and samples.
4. Syntax: Ensure all braces and brackets are balanced. Escape all backslashes properly for JSON serialization.
5. You MUST respond with ONLY a valid JSON object matching the schema below. No markdown fences, no explanation, no text outside the JSON.

OUTPUT SCHEMA:
{
  "questions": [
    {
      "id": "<unique string>",
      "topic": "<topic name>",
      "marks": <integer>,
      "requires_diagram": <boolean>,
      "question_latex": "<raw LaTeX string — properly escaped for JSON>",
      "teacher_answer_latex": "<raw LaTeX string — step-by-step solution>"
    }
  ]
}

LaTeX QUALITY RULES:
- For marks placement on short questions: \unskip\hfill\mbox{\textbf{[X Marks]}}
- For marks on long/multipart questions: \par\noindent\hfill\mbox{\textbf{[X Marks]}}
- Use \mbox{...} around marks labels to prevent line-wrapping.
- DIAGRAM PLACEMENT: ALWAYS place diagrams BELOW the question text, NEVER side-by-side in minipages. Use \begin{center} \begin{tikzpicture} ... \end{tikzpicture} \end{center} after the question text.

DIAGRAM RULES:
- Set requires_diagram=true when the question needs or contains a TikZ diagram.
- For pgfplots graphs always specify: xmin, xmax, ymin, ymax, samples, axis lines=middle.
- Verify coordinates and intersections mentally before generating code.
- All TikZ libraries available: arrows.meta, calc, angles, quotes, patterns, decorations.markings, positioning, pgfplots (compat=1.18).
"""


REGENERATION_SYSTEM_PROMPT = r"""You are an expert LaTeX spatial-reasoning debugger. A teacher has flagged a question whose TikZ diagram contains errors (spatial hallucinations, misaligned coordinates, compiler breaks).

Your job:
1. Analyze the faulty LaTeX and the teacher's feedback.
2. Fix ALL spatial, coordinate, and compilation issues.
3. Return ONLY a valid JSON object with the corrected question.

OUTPUT SCHEMA:
{
  "questions": [
    {
      "id": "<same id as input>",
      "topic": "<topic>",
      "marks": <integer>,
      "requires_diagram": true,
      "question_latex": "<corrected raw LaTeX>",
      "teacher_answer_latex": "<corrected solution LaTeX>"
    }
  ]
}

RULES:
- Use pgfplots for function graphs with explicit xmin/xmax/ymin/ymax/samples.
- Verify every coordinate calculation in your thinking scratchpad.
- Return ONLY the JSON. No markdown, no explanation.
"""


# ---------------------------------------------------------------------------
# Tier classification
# ---------------------------------------------------------------------------

# Keywords that indicate spatial/diagram complexity
_DIAGRAM_KEYWORDS = {
    "graph", "sketch", "plot", "diagram", "triangle", "circle", "angle",
    "coordinate", "geometry", "geometric", "vector", "3d", "slope field",
    "circuit", "tikz", "unit circle", "cartesian", "parabola", "hyperbola",
    "ellipse", "tangent line", "area under", "shad", "region",
}


def classify_tier(request: QuestionGenerationRequest) -> ModelTier:
    """
    Determine which model tier to use based on the request content.

    Returns Tier 2 if topic/instructions suggest diagrams are needed,
    otherwise Tier 1.
    """
    search_text = " ".join([
        request.topic_summary,
        request.subject,
        request.custom_instructions,
        " ".join(request.include),
    ]).lower()

    for keyword in _DIAGRAM_KEYWORDS:
        if keyword in search_text:
            return ModelTier.COMPLEX_DIAGRAM

    return ModelTier.TEXT_MATH


# ---------------------------------------------------------------------------
# Core generation functions
# ---------------------------------------------------------------------------

def _build_generation_prompt(request: QuestionGenerationRequest) -> str:
    """Build the user-facing prompt for question generation."""
    lines = [
        f"Generate {request.num_questions} {request.difficulty} questions for:",
        f"  Course: {request.course}",
        f"  Subject: {request.subject}",
        f"  Topic: {request.topic_summary}",
        f"  Mode: {request.mode}",
    ]

    if request.syllabus_outcomes:
        lines.append(f"  Outcomes: {', '.join(request.syllabus_outcomes)}")
    if request.syllabus_dot_points:
        lines.append(f"  Dot points: {', '.join(request.syllabus_dot_points)}")
    if request.include:
        lines.append(f"  Must include: {', '.join(request.include)}")
    if request.exclude:
        lines.append(f"  Must exclude: {', '.join(request.exclude)}")
    if request.custom_instructions:
        lines.append(f"  Custom instructions: {request.custom_instructions}")

    lines.append("")
    lines.append(
        "Include at least one TikZ diagram for every 3 questions. "
        "Set requires_diagram=true for any question with a diagram. "
        "Respond with ONLY the JSON object."
    )

    return "\n".join(lines)


def _extract_json(raw: str) -> str:
    """Strip markdown fences and extract the JSON object from raw LLM output."""
    # Remove markdown code fences
    fence_pattern = r"```(?:json)?\s*\n?(.*?)```"
    match = re.search(fence_pattern, raw, re.DOTALL)
    if match:
        raw = match.group(1)

    # Find outermost { ... }
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        return raw[start:end + 1]

    return raw.strip()


async def _call_gemini(
    user_prompt: str,
    system_prompt: str,
    tier: ModelTier,
    *,
    student_id: Optional[str] = None,
    document_id: Optional[str] = None,
) -> str:
    """
    Call Gemini with the given prompts and tier configuration.
    Returns the raw text response.
    """
    from google.genai import types

    config_data = TIER_CONFIGS[tier]

    generation_config_kwargs: Dict[str, Any] = {
        "temperature": config_data["temperature"],
        "max_output_tokens": config_data["max_output_tokens"],
        "system_instruction": system_prompt,
        "response_mime_type": "application/json",
    }

    if config_data["thinking"]:
        generation_config_kwargs["thinking_config"] = types.ThinkingConfig(
            thinking_budget=config_data["thinking_budget"],
        )

    config = types.GenerateContentConfig(**generation_config_kwargs)

    client = get_client()
    max_retries = 3
    base_delay = 2
    last_error: Optional[Exception] = None

    for attempt in range(max_retries):
        gemini_request_id = uuid.uuid4().hex
        started = time.perf_counter()
        log_event(
            logger,
            "gemini_request",
            gemini_request_id=gemini_request_id,
            call_site="question_router._call_gemini",
            model=config_data["model"],
            attempt=attempt + 1,
            max_retries=max_retries,
            prompt=text_preview(user_prompt),
            system_prompt=text_preview(system_prompt),
            tier=tier.value,
            student_id_hash=hash_identifier(student_id),
            document_id_hash=hash_identifier(document_id),
            verification_status="pending_json_parse",
        )
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=config_data["model"],
                    contents=user_prompt,
                    config=config,
                ),
                timeout=60.0,
            )
            raw_text = response.text.strip()
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                logger,
                "gemini_response",
                gemini_request_id=gemini_request_id,
                call_site="question_router._call_gemini",
                model=config_data["model"],
                attempt=attempt + 1,
                latency_ms=latency_ms,
                response=text_preview(raw_text),
                tier=tier.value,
                **usage_metadata_from_response(response),
                student_id_hash=hash_identifier(student_id),
                document_id_hash=hash_identifier(document_id),
                verification_status="pending_json_parse",
            )
            return raw_text

        except asyncio.TimeoutError:
            last_error = TimeoutError(f"Gemini timed out (attempt {attempt + 1})")
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                logger,
                "gemini_error",
                level=logging.WARNING,
                gemini_request_id=gemini_request_id,
                call_site="question_router._call_gemini",
                model=config_data["model"],
                attempt=attempt + 1,
                max_retries=max_retries,
                latency_ms=latency_ms,
                tier=tier.value,
                error_type="TimeoutError",
                error_message=str(last_error),
                student_id_hash=hash_identifier(student_id),
                document_id_hash=hash_identifier(document_id),
                verification_status="failed",
            )

        except Exception as e:
            last_error = e
            latency_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                logger,
                "gemini_error",
                level=logging.WARNING if attempt < max_retries - 1 else logging.ERROR,
                gemini_request_id=gemini_request_id,
                call_site="question_router._call_gemini",
                model=config_data["model"],
                attempt=attempt + 1,
                max_retries=max_retries,
                latency_ms=latency_ms,
                tier=tier.value,
                error_type=type(e).__name__,
                error_message=str(e),
                student_id_hash=hash_identifier(student_id),
                document_id_hash=hash_identifier(document_id),
                verification_status="failed",
            )
            if "429" in str(e) or "ResourceExhausted" in str(e):
                await asyncio.sleep(base_delay * (2 ** attempt))
            else:
                await asyncio.sleep(1)

    raise RuntimeError(f"Gemini call failed after {max_retries} attempts: {last_error}")


def _parse_questions(raw_json: str) -> List[ModularQuestion]:
    """Parse the JSON response into ModularQuestion objects."""
    cleaned = _extract_json(raw_json)
    data = json.loads(cleaned)

    questions_data = data.get("questions", [])
    if not questions_data:
        raise ValueError("Response JSON contained no 'questions' array")

    result = []
    for q in questions_data:
        # Ensure each question has an ID
        if not q.get("id"):
            q["id"] = f"q_{uuid.uuid4().hex[:8]}"
        result.append(ModularQuestion(**q))

    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_questions(
    request: QuestionGenerationRequest,
    force_tier: Optional[ModelTier] = None,
    *,
    student_id: Optional[str] = None,
) -> List[ModularQuestion]:
    """
    Generate modular questions using the smart router.

    Classifies the request into a tier (or uses force_tier),
    calls the appropriate Gemini model, and returns parsed questions.
    """
    tier = force_tier or classify_tier(request)
    log_event(
        logger,
        "question_router_selected",
        tier=tier.value,
        model=TIER_CONFIGS[tier]["model"],
        subject=request.subject,
        course=request.course,
        topic_summary=text_preview(request.topic_summary),
        question_count=request.num_questions,
        student_id_hash=hash_identifier(student_id),
    )

    user_prompt = _build_generation_prompt(request)
    raw_response = await _call_gemini(
        user_prompt,
        QUESTION_SYSTEM_PROMPT,
        tier,
        student_id=student_id,
    )

    try:
        questions = _parse_questions(raw_response)
    except Exception as e:
        log_event(
            logger,
            "question_router_verification",
            level=logging.ERROR,
            tier=tier.value,
            model=TIER_CONFIGS[tier]["model"],
            response=text_preview(raw_response),
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(student_id),
            verification_status="failed",
        )
        raise

    log_event(
        logger,
        "question_router_verification",
        tier=tier.value,
        model=TIER_CONFIGS[tier]["model"],
        response=text_preview(raw_response),
        parsed_question_count=len(questions),
        student_id_hash=hash_identifier(student_id),
        verification_status="passed",
    )
    return questions


async def regenerate_question(
    request: RegenerationRequest,
    *,
    student_id: Optional[str] = None,
) -> ModularQuestion:
    """
    Regenerate a single question using Tier 3 (Gemini 3.1 Pro with thinking).
    Used when a diagram fails or has spatial errors.
    """
    user_prompt = (
        f"The following question LaTeX has errors. Fix it.\n\n"
        f"ORIGINAL LATEX:\n{request.original_question_latex}\n\n"
    )
    if request.error_feedback:
        user_prompt += f"TEACHER FEEDBACK:\n{request.error_feedback}\n\n"

    user_prompt += (
        f"Topic: {request.topic}\n"
        f"Marks: {request.marks}\n\n"
        "Return ONLY the corrected JSON."
    )

    raw_response = await _call_gemini(
        user_prompt,
        REGENERATION_SYSTEM_PROMPT,
        ModelTier.ADVANCED_FALLBACK,
        student_id=student_id,
    )

    try:
        questions = _parse_questions(raw_response)
    except Exception as e:
        log_event(
            logger,
            "question_router_verification",
            level=logging.ERROR,
            tier=ModelTier.ADVANCED_FALLBACK.value,
            model=TIER_CONFIGS[ModelTier.ADVANCED_FALLBACK]["model"],
            response=text_preview(raw_response),
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(student_id),
            verification_status="failed",
        )
        raise

    if not questions:
        raise RuntimeError("Tier 3 regeneration returned no questions")

    log_event(
        logger,
        "question_router_verification",
        tier=ModelTier.ADVANCED_FALLBACK.value,
        model=TIER_CONFIGS[ModelTier.ADVANCED_FALLBACK]["model"],
        response=text_preview(raw_response),
        parsed_question_count=len(questions),
        student_id_hash=hash_identifier(student_id),
        verification_status="passed",
    )
    return questions[0]
