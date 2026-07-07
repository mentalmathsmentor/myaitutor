import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import text, select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.tutor_models import ChatThread, Message, Tutor, TutorClass
from ..db.session import get_db
from ..models import ExoskeletonResponse, FatigueStatus, StudentContext
from ..services import generation_engine, wellness_engine, educational_agent, storage
from ..services.generation_engine import TutorIntent
from ..services.syllabus_service import syllabus_service
from ..services.blooms_engine import assess_response_level, advance_bloom_level, get_bloom_teaching_strategy
from ..deps import get_current_tutor, verify_student_auth, get_or_create_context, limiter

router = APIRouter()


class InitClassRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    year_level: int = Field(..., ge=7, le=12)
    subject: str = Field(..., min_length=1, max_length=200)
    ability_tier: str = Field(..., min_length=1, max_length=100)
    profile_metadata: dict[str, Any] = Field(default_factory=dict)


class GenerateChatRequest(BaseModel):
    class_id: UUID
    thread_id: UUID
    intent: TutorIntent
    # Optional since the §4 fallback ratification (07/07/2026): open-ended
    # queries may omit the topic and ride on refinements alone. An explicit
    # empty string is still rejected.
    topic: str | None = Field(default=None, min_length=1, max_length=300)
    refinements: str | None = Field(default=None, max_length=2000)


def _serialize_class(class_obj: TutorClass) -> dict[str, Any]:
    return {
        "id": str(class_obj.id),
        "tutor_id": str(class_obj.tutor_id),
        "name": class_obj.name,
        "year_level": class_obj.year_level,
        "subject": class_obj.subject,
        "ability_tier": class_obj.ability_tier,
        "profile_metadata": class_obj.profile_metadata,
    }


def _serialize_thread(thread: ChatThread) -> dict[str, Any]:
    return {
        "id": str(thread.id),
        "tutor_id": str(thread.tutor_id),
        "class_id": str(thread.class_id) if thread.class_id else None,
        "title": thread.title,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
    }


async def _ensure_local_dev_tutor(session: AsyncSession, tutor_id: UUID) -> None:
    stmt = pg_insert(Tutor).values(
        id=tutor_id,
        email="dev@mait.local",
        name="Local Dev",
        google_id=None,
    )
    stmt = stmt.on_conflict_do_nothing(index_elements=[Tutor.id])
    await session.execute(stmt)


@router.post("/api/classes/init")
async def init_class(
    body: InitClassRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_local_dev_tutor(db, tutor_id)

    class_obj = TutorClass(
        tutor_id=tutor_id,
        name=body.name,
        year_level=body.year_level,
        subject=body.subject,
        ability_tier=body.ability_tier,
        profile_metadata=body.profile_metadata,
    )
    db.add(class_obj)
    await db.flush()

    thread = ChatThread(
        tutor_id=tutor_id,
        class_id=class_obj.id,
        title=f"{body.name} prep",
    )
    db.add(thread)
    await db.commit()
    await db.refresh(class_obj)
    await db.refresh(thread)
    return {"class": _serialize_class(class_obj), "thread": _serialize_thread(thread)}


@router.delete("/api/classes/{class_id}")
async def delete_class(
    class_id: UUID,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(
        select(TutorClass).where(
            TutorClass.id == class_id,
            TutorClass.tutor_id == tutor_id,
        )
    )
    class_obj = class_result.scalar_one_or_none()
    if class_obj is None:
        raise HTTPException(status_code=404, detail="Class not found")

    await db.execute(
        delete(ChatThread).where(
            ChatThread.class_id == class_id,
            ChatThread.tutor_id == tutor_id,
        )
    )
    await db.delete(class_obj)
    await db.commit()
    return {"status": "ok", "deleted_class_id": str(class_id)}


@router.get("/api/topics")
async def list_topics(
    subject: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = text("""
        SELECT DISTINCT metadata_json->>'topic' AS topic
        FROM vector_chunks
        WHERE subject = :subject
          AND metadata_json->>'topic' IS NOT NULL
        ORDER BY topic
    """)
    result = await db.execute(stmt, {"subject": subject})
    topics = [row.topic for row in result if row.topic]
    return {"subject": subject, "topics": topics}


INTENT_LABELS = {
    "warmup": "Warmup",
    "lesson_plan": "Lesson Plan",
    "practice_set": "Practice Set",
    "challenge": "Boss Challenge",
    "explain_alt": "Explain Another Way",
    "activity": "Activity",
    "chat": "Chat"
}


@router.get("/api/classes")
async def list_classes(
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorClass).where(TutorClass.tutor_id == tutor_id)
    )
    classes = result.scalars().all()
    return {"classes": [_serialize_class(c) for c in classes]}


@router.get("/api/threads/{class_id}")
async def list_threads(
    class_id: UUID,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(
        select(TutorClass).where(
            TutorClass.id == class_id,
            TutorClass.tutor_id == tutor_id,
        )
    )
    class_obj = class_result.scalar_one_or_none()
    if class_obj is None:
        raise HTTPException(status_code=404, detail="Class not found")

    threads_result = await db.execute(
        select(ChatThread).where(
            ChatThread.class_id == class_id,
            ChatThread.tutor_id == tutor_id,
        )
    )
    threads = threads_result.scalars().all()

    serialized_threads = []
    for thread in threads:
        messages_result = await db.execute(
            select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
        )
        messages = messages_result.scalars().all()

        serialized_messages = []
        for msg in messages:
            if msg.role == "user":
                try:
                    payload = json.loads(msg.content)
                    intent = payload.get("intent", "chat")
                    topic = payload.get("topic", "")
                    refinements = payload.get("refinements", "")
                    
                    label = INTENT_LABELS.get(intent, "Teacher")
                    if intent == "chat":
                        content_str = refinements or topic
                    else:
                        content_str = f"{topic} · {refinements}" if refinements else topic
                        
                    serialized_messages.append({
                        "id": str(msg.id),
                        "role": "teacher",
                        "title": label,
                        "content": content_str,
                        "created_at": msg.created_at.isoformat() if msg.created_at else None,
                    })
                except Exception:
                    serialized_messages.append({
                        "id": str(msg.id),
                        "role": "teacher",
                        "title": "Teacher",
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat() if msg.created_at else None,
                    })
            else:
                try:
                    payload = json.loads(msg.content)
                    parts = payload.get("parts", [])
                except Exception:
                    parts = []
                serialized_messages.append({
                    "id": str(msg.id),
                    "role": "assistant",
                    "parts": parts,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                })

        serialized_threads.append({
            "id": str(thread.id),
            "class_id": str(thread.class_id),
            "title": thread.title,
            "created_at": thread.created_at.isoformat() if thread.created_at else None,
            "messages": serialized_messages,
        })

    return {"threads": serialized_threads}


@router.post("/api/chat/generate", response_model=ExoskeletonResponse)
async def generate_chat(
    body: GenerateChatRequest,
    tutor_id: UUID = Depends(get_current_tutor),
    db: AsyncSession = Depends(get_db),
):
    class_result = await db.execute(
        select(TutorClass).where(
            TutorClass.id == body.class_id,
            TutorClass.tutor_id == tutor_id,
        )
    )
    class_obj = class_result.scalar_one_or_none()
    if class_obj is None:
        raise HTTPException(status_code=404, detail="Class not found")

    thread_result = await db.execute(
        select(ChatThread).where(
            ChatThread.id == body.thread_id,
            ChatThread.tutor_id == tutor_id,
            ChatThread.class_id == body.class_id,
        )
    )
    thread = thread_result.scalar_one_or_none()
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found for class")

    # The router owns retrieval (directive §2): embed the free text (or the
    # topic as fallback), run the locked pgvector query, and hand the engine
    # the pre-formatted chunk block.
    intent = body.intent.value
    refinements = (body.refinements or "").strip()
    topic = (body.topic or "").strip()
    if not topic and not refinements:
        raise HTTPException(
            status_code=400,
            detail="Provide a topic or refinements — at least one is required to ground retrieval.",
        )
    try:
        query_embedding = await generation_engine.embed_query(refinements or topic)
        rows = []
        if topic:
            rows = await generation_engine.retrieve_chunks(
                db,
                subject=class_obj.subject,
                topic=topic,
                query_embedding=query_embedding,
            )
        if not rows:
            # §4 ratified fallback (07/07/2026): no topic selected, or the
            # exact-topic filter came back empty — search subject-wide so
            # generation stays grounded in the NESA corpus.
            rows = await generation_engine.retrieve_chunks_subject_only(
                db,
                subject=class_obj.subject,
                query_embedding=query_embedding,
            )
        citations = generation_engine.build_citations(rows)
        rag_chunks = generation_engine.format_rag_chunks(rows)

        response_model = await generation_engine.generate_teach_response(
            intent=body.intent,
            topic=topic,
            year_level=class_obj.year_level,
            subject=class_obj.subject,
            ability_tier=class_obj.ability_tier,
            refinements=refinements,
            rag_chunks=rag_chunks,
            student_context="",  # Tutor V1 socket — no session/student source yet
        )
    except generation_engine.UnsupportedIntentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except generation_engine.GenerationEngineError as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    user_content = json.dumps(
        {
            "intent": intent,
            "topic": topic,
            "refinements": body.refinements,
        },
        ensure_ascii=False,
    )
    db.add(Message(thread_id=thread.id, role="user", content=user_content, retrieval_citations=[]))
    db.add(
        Message(
            thread_id=thread.id,
            role="assistant",
            content=response_model.model_dump_json(),
            retrieval_citations=citations,
        )
    )
    await db.commit()
    return response_model


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
