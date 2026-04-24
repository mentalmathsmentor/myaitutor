from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models import StudentContext, FatigueStatus
from ..services import wellness_engine, educational_agent, storage
from ..services.syllabus_service import syllabus_service
from ..services.blooms_engine import assess_response_level, advance_bloom_level, get_bloom_teaching_strategy
from ..deps import verify_student_auth, get_or_create_context, limiter

router = APIRouter()


class InteractionRequest(BaseModel):
    student_id: str = Field(default="default_user", min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=1000, description="Student's question")
    complexity: int = Field(default=1, ge=1, le=10, description="Question complexity (1-10)")


@router.get("/context/{student_id}", response_model=StudentContext)
async def get_context(
    request: Request,
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    await verify_student_auth(request, student_id)
    return await get_or_create_context(student_id, db)


@router.post("/interact")
@limiter.limit("20/minute")
async def interact(
    request: Request,
    body: InteractionRequest,
    db: AsyncSession = Depends(get_db),
):
    await verify_student_auth(request, body.student_id)
    context = await get_or_create_context(body.student_id, db)

    context = wellness_engine.check_wellness(context)
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
        await storage.save_context(db, body.student_id, context)
        return {
            "response": "LOCKOUT ACTIVE. Go take a break, mate.",
            "context": context,
            "blooms_level": context.pedagogical_state.blooms_level.value,
            "mastery_score": context.pedagogical_state.mastery_score
        }

    context = wellness_engine.update_fatigue(context, body.complexity)

    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
         response_text = "Whoa, you just hit the wall. Break time!"
    else:
         response_text = await educational_agent.generate_response_async(body.query, context, db)

    await storage.save_context(db, body.student_id, context)

    return {
        "response": response_text,
        "context": context,
        "blooms_level": context.pedagogical_state.blooms_level.value,
        "mastery_score": context.pedagogical_state.mastery_score
    }


@router.post("/query")
async def query_api(
    request: Request,
    body: InteractionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Query the API and return chunked sections for display as separate message bubbles.
    """
    await verify_student_auth(request, body.student_id)
    context = await get_or_create_context(body.student_id, db)

    context = wellness_engine.check_wellness(context)
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
        return {
            "sections": ["LOCKOUT ACTIVE. Go take a break, mate."],
            "source": "api",
            "context": context,
            "blooms_level": context.pedagogical_state.blooms_level.value,
            "mastery_score": context.pedagogical_state.mastery_score
        }

    context = wellness_engine.update_fatigue(context, body.complexity)

    topic = context.pedagogical_state.current_topic or "Mathematics"
    demonstrated_level = assess_response_level(body.query, topic)
    bloom_instruction = get_bloom_teaching_strategy(context.pedagogical_state.blooms_level)

    context = advance_bloom_level(context, demonstrated_level)

    from ..services.gemini_client import get_gemini_response

    try:
        syllabus_context = syllabus_service.get_relevant_context(
            query=body.query,
            fatigue_status=context.fatigue_metric.status,
            year=None
        )
    except Exception as e:
        print(f"RAG retrieval failed in /query (non-fatal): {e}")
        syllabus_context = ""

    conversation_history = await storage.get_history(db, body.student_id, limit=20)

    token_estimate = await storage.get_history_token_estimate(db, body.student_id)
    if token_estimate > 6000 and conversation_history:
        while conversation_history and token_estimate > 6000:
            removed = conversation_history.pop(0)
            token_estimate -= len(removed["content"]) // 4

    gemini_response = await get_gemini_response(
        question=body.query,
        syllabus_context=syllabus_context,
        fatigue_state=context.fatigue_metric.status,
        current_topic=topic,
        bloom_instruction=bloom_instruction,
        conversation_history=conversation_history
    )

    response_text = gemini_response.get("text", "")
    await storage.save_message(
        db, body.student_id, "user", body.query,
        fatigue_state=context.fatigue_metric.status.value,
        blooms_level=context.pedagogical_state.blooms_level.value,
        topic=topic
    )
    await storage.save_message(
        db, body.student_id, "assistant", response_text,
        fatigue_state=context.fatigue_metric.status.value,
        blooms_level=context.pedagogical_state.blooms_level.value,
        topic=topic
    )

    await storage.save_context(db, body.student_id, context)

    return {
        "sections": gemini_response.get("sections", [gemini_response.get("text", "Error")]),
        "source": "api",
        "context": context,
        "blooms_level": context.pedagogical_state.blooms_level.value,
        "mastery_score": context.pedagogical_state.mastery_score
    }


@router.post("/reset/{student_id}")
async def reset_context(
    request: Request,
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    await verify_student_auth(request, student_id)
    context = StudentContext(student_id=student_id)
    await storage.save_context(db, student_id, context)
    await storage.clear_history(db, student_id)
    return {"message": "Student context and history cleared", "context": context}


@router.get("/history/{student_id}")
async def get_history(
    request: Request,
    student_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve conversation history for a student."""
    await verify_student_auth(request, student_id)
    history = await storage.get_history(db, student_id, limit=limit)
    return {"student_id": student_id, "messages": history}
