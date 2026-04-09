"""
Question Generation API Routes
===============================
Modular question generation with smart tier routing.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..deps import verify_student_auth, limiter
from ..services.question_router import (
    QuestionGenerationRequest,
    RegenerationRequest,
    ModelTier,
    generate_questions,
    regenerate_question,
)

router = APIRouter(prefix="/questions", tags=["questions"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class GenerateQuestionsBody(BaseModel):
    student_id: str
    request: QuestionGenerationRequest
    force_tier: Optional[str] = None  # "tier1", "tier2", "tier3"


class RegenerateBody(BaseModel):
    student_id: str
    original_question_latex: str
    error_feedback: str = ""
    topic: str = ""
    marks: int = 2


class QuestionResponse(BaseModel):
    id: str
    topic: str
    marks: int
    requires_diagram: bool
    question_latex: str
    teacher_answer_latex: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate")
@limiter.limit("10/minute")
async def generate(request: Request, body: GenerateQuestionsBody):
    """
    Generate modular questions routed through the smart tier system.

    Tier 1: Text & standard math → gemini-3.1-flash-lite
    Tier 2: Complex diagrams → gemini-3.0-flash + thinking
    Tier 3: Only via force_tier or /regenerate endpoint
    """
    await verify_student_auth(request, body.student_id)

    force_tier = None
    if body.force_tier:
        try:
            force_tier = ModelTier(body.force_tier)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid tier: {body.force_tier}. Must be tier1, tier2, or tier3.",
            )

    try:
        questions = await generate_questions(body.request, force_tier=force_tier)

        return {
            "questions": [q.model_dump() for q in questions],
            "count": len(questions),
            "tier_used": (force_tier or ModelTier.TEXT_MATH).value,
        }

    except Exception as e:
        print(f"[Questions] Generation error: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/regenerate")
@limiter.limit("5/minute")
async def regenerate(request: Request, body: RegenerateBody):
    """
    Regenerate a single question using Tier 3 (Gemini 3.1 Pro + thinking).
    Triggered by the "Regenerate Diagram" button when Tier 2 output is faulty.
    """
    await verify_student_auth(request, body.student_id)

    try:
        regen_request = RegenerationRequest(
            original_question_latex=body.original_question_latex,
            error_feedback=body.error_feedback,
            topic=body.topic,
            marks=body.marks,
        )
        question = await regenerate_question(regen_request)

        return {
            "question": question.model_dump(),
            "tier_used": "tier3",
        }

    except Exception as e:
        print(f"[Questions] Regeneration error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
