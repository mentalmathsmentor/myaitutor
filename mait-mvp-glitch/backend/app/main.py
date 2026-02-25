import shutil

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env file immediately
load_dotenv()

from .models import StudentContext, FatigueStatus, KeystrokeSubmission, KeystrokeMetrics, KeystrokeProfile
from .services import wellness_engine, educational_agent
from .services import storage
from .services.syllabus_service import syllabus_service
from .services.blooms_engine import assess_response_level, advance_bloom_level, get_bloom_teaching_strategy
from .services.artifact_engine import (
    WorksheetRequest,
    generate_worksheet_pdf,
    get_topics_for_year,
    get_all_topics,
)
import os
from datetime import datetime
from typing import Optional

app = FastAPI(title="MAIT MVP (The Glitch Edition)")


@app.on_event("startup")
async def startup_event():
    """Startup event - initialize SQLite database."""
    print("MAIT Backend starting...")
    await storage.init_db()
    print("SQLite database initialized.")
    print("RAG system enabled (FAISS backend).")
    print("Application startup complete.")

# Enable CORS - Security: Only allow specific origins
# For production, replace with actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # REVERTED: Allow all for MVP dev to fix 400 Error
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],
)

class InteractionRequest(BaseModel):
    student_id: str = Field(default="default_user", min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=1000, description="Student's question")
    complexity: int = Field(default=1, ge=1, le=10, description="Question complexity (1-10)")

@app.get("/")
def read_root():
    return {"status": "online", "system": "MAIT MVP"}

async def get_or_create_context(student_id: str) -> StudentContext:
    context = await storage.get_context(student_id)
    if context is None:
        context = StudentContext(student_id=student_id)
        await storage.save_context(student_id, context)
    return context

@app.get("/context/{student_id}", response_model=StudentContext)
async def get_context(student_id: str):
    return await get_or_create_context(student_id)

@app.post("/interact")
async def interact(request: InteractionRequest):
    # 1. Retrieve/Create Context
    context = await get_or_create_context(request.student_id)

    # 2. Check Wellness BEFORE processing
    context = wellness_engine.check_wellness(context)
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
        await storage.save_context(request.student_id, context)
        return {
            "response": "LOCKOUT ACTIVE. Go take a break, mate.",
            "context": context,
            "blooms_level": context.pedagogical_state.blooms_level.value,
            "mastery_score": context.pedagogical_state.mastery_score
        }

    # 3. Update Fatigue for this interaction
    context = wellness_engine.update_fatigue(context, request.complexity)

    # 4. Generate Response using real Gemini LLM (if not locked out after update)
    #    Note: educational_agent.generate_response_async now handles Bloom's
    #    assessment, advancement, and prompt injection internally.
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
         response_text = "Whoa, you just hit the wall. Break time!"
    else:
         # Use async Gemini integration - fatigue + bloom state injected into system prompt
         response_text = await educational_agent.generate_response_async(request.query, context)

    # 5. Save Context (bloom level updated by educational_agent)
    await storage.save_context(request.student_id, context)

    return {
        "response": response_text,
        "context": context,
        "blooms_level": context.pedagogical_state.blooms_level.value,
        "mastery_score": context.pedagogical_state.mastery_score
    }

@app.post("/query")
async def query_api(request: InteractionRequest):
    """
    Query the API and return chunked sections for display as separate message bubbles.
    This is used when the frontend detects a query that needs API enrichment.
    """
    # Get context
    context = await get_or_create_context(request.student_id)

    # Check wellness
    context = wellness_engine.check_wellness(context)
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
        return {
            "sections": ["LOCKOUT ACTIVE. Go take a break, mate."],
            "source": "api",
            "context": context,
            "blooms_level": context.pedagogical_state.blooms_level.value,
            "mastery_score": context.pedagogical_state.mastery_score
        }

    # Update fatigue
    context = wellness_engine.update_fatigue(context, request.complexity)

    # Bloom's Taxonomy - assess query and get teaching strategy
    topic = context.pedagogical_state.current_topic or "Mathematics"
    demonstrated_level = assess_response_level(request.query, topic)
    bloom_instruction = get_bloom_teaching_strategy(context.pedagogical_state.blooms_level)

    # Advance bloom level based on demonstrated cognitive level
    context = advance_bloom_level(context, demonstrated_level)

    # Get response from Gemini with RAG-retrieved context and bloom instruction
    from .services.gemini_client import get_gemini_response

    # RAG retrieval via FAISS
    try:
        syllabus_context = syllabus_service.get_relevant_context(
            query=request.query,
            fatigue_status=context.fatigue_metric.status,
            year=None
        )
    except Exception as e:
        print(f"RAG retrieval failed in /query (non-fatal): {e}")
        syllabus_context = ""

    gemini_response = await get_gemini_response(
        question=request.query,
        syllabus_context=syllabus_context,
        fatigue_state=context.fatigue_metric.status,
        current_topic=topic,
        bloom_instruction=bloom_instruction
    )

    # Save context (bloom level updated above)
    await storage.save_context(request.student_id, context)

    return {
        "sections": gemini_response.get("sections", [gemini_response.get("text", "Error")]),
        "source": "api",
        "context": context,
        "blooms_level": context.pedagogical_state.blooms_level.value,
        "mastery_score": context.pedagogical_state.mastery_score
    }

@app.post("/reset/{student_id}")
async def reset_context(student_id: str):
    context = StudentContext(student_id=student_id)
    await storage.save_context(student_id, context)
    return context


# ============================================
# KEYSTROKE PSYCHOMETRIC ENDPOINTS
# ============================================

@app.post("/keystroke-metrics")
async def submit_keystroke_metrics(submission: KeystrokeSubmission):
    """
    Submit keystroke metrics for a typing session.
    Updates the student's keystroke profile with aggregated stats.
    """
    context = await get_or_create_context(submission.student_id)
    profile = context.keystroke_profile
    metrics = submission.metrics

    # Update session count
    total_sessions = profile.total_sessions + 1

    # Calculate weighted averages
    if total_sessions == 1:
        # First session - use raw values
        profile.average_wpm = metrics.wpm
        profile.average_dwell_time_ms = metrics.avg_dwell_time_ms
        profile.average_flight_time_ms = metrics.avg_flight_time_ms
        profile.average_thinking_time_ms = metrics.avg_thinking_time_ms
    else:
        # Weighted average with previous sessions
        weight = 1 / total_sessions
        prev_weight = 1 - weight
        profile.average_wpm = round(prev_weight * profile.average_wpm + weight * metrics.wpm, 1)
        profile.average_dwell_time_ms = round(prev_weight * profile.average_dwell_time_ms + weight * metrics.avg_dwell_time_ms, 1)
        profile.average_flight_time_ms = round(prev_weight * profile.average_flight_time_ms + weight * metrics.avg_flight_time_ms, 1)
        profile.average_thinking_time_ms = round(prev_weight * profile.average_thinking_time_ms + weight * metrics.avg_thinking_time_ms, 1)

    # Update totals
    profile.total_sessions = total_sessions
    profile.total_characters_typed += metrics.characters_typed
    profile.total_error_corrections += metrics.error_corrections
    profile.typing_rhythm_variance = metrics.rhythm_variance
    profile.last_updated = datetime.now()

    # Calculate message frequency (messages per 15-minute window)
    recent_timestamps = [ts for ts in context.message_timestamps
                        if (datetime.now() - ts).total_seconds() < 900]
    profile.message_frequency_per_minute = round(len(recent_timestamps) / 15, 2)

    # Behavioral analysis
    profile.typing_speed_category = classify_typing_speed(profile.average_wpm)
    profile.consistency_category = classify_consistency(profile.typing_rhythm_variance)
    profile.thinking_pattern = classify_thinking_pattern(profile.average_thinking_time_ms)
    profile.error_tendency = classify_error_tendency(
        profile.total_error_corrections,
        profile.total_characters_typed
    )

    # Store session in history (keep last 50)
    profile.session_history = profile.session_history[-49:] + [metrics]

    # Save updated context
    context.keystroke_profile = profile
    await storage.save_context(submission.student_id, context)

    return {
        "status": "success",
        "profile": profile
    }


@app.get("/keystroke-profile/{student_id}")
async def get_keystroke_profile(student_id: str):
    """Get the keystroke psychometric profile for a student."""
    context = await get_or_create_context(student_id)
    return {
        "student_id": student_id,
        "profile": context.keystroke_profile
    }


@app.delete("/keystroke-profile/{student_id}")
async def reset_keystroke_profile(student_id: str):
    """Reset keystroke profile for a student."""
    context = await get_or_create_context(student_id)
    context.keystroke_profile = KeystrokeProfile()
    await storage.save_context(student_id, context)
    return {"status": "success", "message": "Keystroke profile reset"}


# Helper functions for behavioral classification
def classify_typing_speed(wpm: float) -> str:
    if wpm > 60:
        return "fast"
    elif wpm > 40:
        return "moderate"
    elif wpm > 20:
        return "slow"
    return "very_slow"


def classify_consistency(variance: float) -> str:
    if variance < 5000:
        return "very_consistent"
    elif variance < 15000:
        return "consistent"
    elif variance < 30000:
        return "moderate"
    return "variable"


def classify_thinking_pattern(avg_thinking_ms: float) -> str:
    if avg_thinking_ms > 10000:
        return "deliberate"
    elif avg_thinking_ms > 5000:
        return "thoughtful"
    elif avg_thinking_ms > 2000:
        return "moderate"
    return "quick"


def classify_error_tendency(errors: int, chars: int) -> str:
    if chars == 0:
        return "unknown"
    error_rate = (errors / chars) * 100
    if error_rate < 2:
        return "accurate"
    elif error_rate < 5:
        return "normal"
    elif error_rate < 10:
        return "error_prone"
    return "high_error"


# ============================================
# ARTIFACT GENERATION ENGINE (A.G.E.) ENDPOINTS
# ============================================

@app.post("/generate-worksheet")
async def generate_worksheet(request: WorksheetRequest):
    """
    Generate a NESA-styled maths worksheet PDF.

    Accepts a WorksheetRequest body and returns the compiled PDF file.
    The pipeline: WorksheetRequest -> Gemini (LaTeX) -> pdflatex -> PDF response.
    """
    pdf_path: Optional[str] = None
    try:
        pdf_path = await generate_worksheet_pdf(request)

        # Build a human-readable filename
        safe_topic = request.topic.replace(" ", "_").replace("/", "-")[:40]
        filename = f"worksheet_yr{request.year_level}_{safe_topic}.pdf"

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as e:
        # Known pipeline failures (Gemini timeout, LaTeX compilation, pdflatex missing)
        print(f"[A.G.E.] Worksheet generation failed: {e}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "worksheet_generation_failed",
                "message": str(e),
            },
        )
    except Exception as e:
        # Unexpected errors
        print(f"[A.G.E.] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": f"An unexpected error occurred: {str(e)}",
            },
        )


@app.get("/worksheet-topics")
def list_worksheet_topics(year_level: Optional[int] = Query(default=None, ge=7, le=12)):
    """
    Return available worksheet topics from the NSW HSC syllabus catalogue.

    Query params:
        year_level (int, optional): Filter topics for a specific year (7-12).
                                    If omitted, returns all years.
    """
    if year_level is not None:
        topics = get_topics_for_year(year_level)
        if not topics:
            raise HTTPException(
                status_code=404,
                detail=f"No topics found for year level {year_level}.",
            )
        return {
            "year_level": year_level,
            "topics": topics,
            "count": len(topics),
        }

    all_topics = get_all_topics()
    return {
        "year_levels": sorted(all_topics.keys()),
        "topics_by_year": {
            str(year): {"topics": topics, "count": len(topics)}
            for year, topics in sorted(all_topics.items())
        },
        "total_topics": sum(len(t) for t in all_topics.values()),
    }


# ============================================
# WAITLIST / SUBSCRIBE
# ============================================

class SubscribeRequest(BaseModel):
    email: str

@app.post("/subscribe")
async def subscribe_waitlist(request: SubscribeRequest):
    """Save waitlist email to SQLite database."""
    try:
        await storage.save_email(request.email)
        return {"status": "success", "message": "Joined waitlist"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
