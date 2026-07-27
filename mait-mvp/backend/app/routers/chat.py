from enum import Enum
import asyncio
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
from ..services import wellness_engine, educational_agent, storage
from ..services.gemini_client import get_client, generate_content_async
from ..services.prompts import INTENT_TEMPLATES, SYSTEM_INSTRUCTION_CORE
from ..services.syllabus_service import syllabus_service
from ..services.blooms_engine import assess_response_level, advance_bloom_level, get_bloom_teaching_strategy
from ..deps import get_current_tutor, verify_student_auth, get_or_create_context, limiter

router = APIRouter()


class TutorIntent(str, Enum):
    WARMUP = "warmup"
    LESSON_PLAN = "lesson_plan"
    PRACTICE_SET = "practice_set"
    CHALLENGE = "challenge"
    EXPLAIN_ALT = "explain_alt"
    ACTIVITY = "activity"
    CHAT = "chat"


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
    topic: str = Field(..., min_length=1, max_length=300)
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


def _embedding_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _embed_query_sync(query: str) -> list[float]:
    from google.genai import types

    client = get_client()
    response = client.models.embed_content(
        model="models/gemini-embedding-2",
        contents=query,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values


async def _embed_query(query: str) -> list[float]:
    return await asyncio.to_thread(_embed_query_sync, query)


async def _generate_exoskeleton_response(prompt: str) -> ExoskeletonResponse:
    from google.genai import types

    full_prompt = f"{SYSTEM_INSTRUCTION_CORE}\n\n{prompt}"
    config = types.GenerateContentConfig(
        temperature=0.4,
        max_output_tokens=8000,
        response_mime_type="application/json",
        response_schema=ExoskeletonResponse,
    )

    response = await generate_content_async(
        contents=full_prompt,
        config=config,
        model="gemini-3.5-flash",
        timeout=60.0,
    )

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, ExoskeletonResponse):
        return parsed
    if parsed is not None:
        return ExoskeletonResponse.model_validate(parsed)
    return ExoskeletonResponse.model_validate_json(response.text)


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

    query_text = (body.refinements or "").strip() or body.topic
    query_embedding = await _embed_query(query_text)
    query_embedding_literal = _embedding_literal(query_embedding)

    retrieval_stmt = text("""
        SELECT
            id,
            content,
            content_code,
            subject,
            source_document,
            metadata_json,
            embedding <=> CAST(:query_embedding AS vector) AS distance
        FROM vector_chunks
        WHERE subject = :subject
          AND metadata_json->>'topic' = :topic
        ORDER BY embedding <=> CAST(:query_embedding AS vector)
        LIMIT 3
    """)
    retrieval_result = await db.execute(
        retrieval_stmt,
        {
            "query_embedding": query_embedding_literal,
            "subject": class_obj.subject,
            "topic": body.topic,
        },
    )
    rows = retrieval_result.mappings().all()

    citations = [
        {
            "id": str(row["id"]),
            "content_code": row["content_code"],
            "subject": row["subject"],
            "topic": row["metadata_json"].get("topic") if row["metadata_json"] else None,
            "source_document": row["source_document"],
            "distance": float(row["distance"]) if row["distance"] is not None else None,
        }
        for row in rows
    ]
    retrieved_chunks = "\n\n".join(
        (
            f"[Chunk {index}] content_code={row['content_code'] or 'n/a'} "
            f"topic={(row['metadata_json'] or {}).get('topic') or 'n/a'} "
            f"source={row['source_document'] or 'n/a'}\n{row['content']}"
        )
        for index, row in enumerate(rows, start=1)
    )
    if not retrieved_chunks:
        retrieved_chunks = "No exact topic chunks were retrieved for this subject/topic filter."

    intent = body.intent.value
    if intent not in INTENT_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Unsupported intent: {intent}")

    prompt = INTENT_TEMPLATES[intent].format(
        rag_chunks=retrieved_chunks,
        year_level=class_obj.year_level,
        subject=class_obj.subject,
        ability_tier=class_obj.ability_tier,
        refinements=(body.refinements or "").strip(),
    )

    try:
        response_model = await _generate_exoskeleton_response(prompt)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Gemini generation failed: {exc}") from exc

    user_content = json.dumps(
        {
            "intent": intent,
            "topic": body.topic,
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
