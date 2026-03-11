import shutil

from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables from .env file immediately
load_dotenv()

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .models import StudentContext, FatigueStatus, KeystrokeSubmission, KeystrokeMetrics, KeystrokeProfile
from .services import wellness_engine, educational_agent
from .services import storage
from .services.auth import verify_google_token
from .services.syllabus_service import syllabus_service
from .services.blooms_engine import assess_response_level, advance_bloom_level, get_bloom_teaching_strategy
from .services.artifact_engine import (
    WorksheetRequest,
    generate_worksheet_pdf,
    get_topics_for_year,
    get_all_topics,
)
import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

# Initialize Sentry for error tracking
SENTRY_DSN = os.getenv("SENTRY_DSN")

# Adjust Sentry sampling rates
SENTRY_TRACES_SAMPLE_RATE = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
SENTRY_PROFILES_SAMPLE_RATE = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,
    )

app = FastAPI(title="MAIT MVP")

# Simple Auth: Verify Student-ID header for sensitive data
async def verify_student_auth(request: Request, student_id: str):
    header_id = request.headers.get("X-Student-Id")
    if header_id and header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Student ID mismatch")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
async def startup_event():
    """Startup event - initialize SQLite database."""
    print("MAIT Backend starting...")
    await storage.init_db()
    print("SQLite database initialized.")
    print("RAG system enabled (FAISS backend).")
    print("Application startup complete.")

# CORS - environment-based origins
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
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
async def get_context(request: Request, student_id: str):
    await verify_student_auth(request, student_id)
    return await get_or_create_context(student_id)

@app.post("/interact")
@limiter.limit("20/minute")
async def interact(request: Request, body: InteractionRequest):
    await verify_student_auth(request, body.student_id)
    # 1. Retrieve/Create Context
    context = await get_or_create_context(body.student_id)

    # 2. Check Wellness BEFORE processing
    context = wellness_engine.check_wellness(context)
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
        await storage.save_context(body.student_id, context)
        return {
            "response": "LOCKOUT ACTIVE. Go take a break, mate.",
            "context": context,
            "blooms_level": context.pedagogical_state.blooms_level.value,
            "mastery_score": context.pedagogical_state.mastery_score
        }

    # 3. Update Fatigue for this interaction
    context = wellness_engine.update_fatigue(context, body.complexity)

    # 4. Generate Response using real Gemini LLM (if not locked out after update)
    #    Note: educational_agent.generate_response_async now handles Bloom's
    #    assessment, advancement, and prompt injection internally.
    if context.fatigue_metric.status == FatigueStatus.LOCKOUT:
         response_text = "Whoa, you just hit the wall. Break time!"
    else:
         # Use async Gemini integration - fatigue + bloom state injected into system prompt
         response_text = await educational_agent.generate_response_async(body.query, context)

    # 5. Save Context (bloom level updated by educational_agent)
    await storage.save_context(body.student_id, context)

    return {
        "response": response_text,
        "context": context,
        "blooms_level": context.pedagogical_state.blooms_level.value,
        "mastery_score": context.pedagogical_state.mastery_score
    }

@app.post("/query")
async def query_api(request: Request, body: InteractionRequest):
    """
    Query the API and return chunked sections for display as separate message bubbles.
    This is used when the frontend detects a query that needs API enrichment.
    """
    await verify_student_auth(request, body.student_id)
    # Get context
    context = await get_or_create_context(body.student_id)

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

    # Fetch conversation history
    conversation_history = await storage.get_history(request.student_id, limit=20)

    # Prune history if token estimate exceeds budget
    token_estimate = await storage.get_history_token_estimate(request.student_id)
    if token_estimate > 6000 and conversation_history:
        while conversation_history and token_estimate > 6000:
            removed = conversation_history.pop(0)
            token_estimate -= len(removed["content"]) // 4

    gemini_response = await get_gemini_response(
        question=request.query,
        syllabus_context=syllabus_context,
        fatigue_state=context.fatigue_metric.status,
        current_topic=topic,
        bloom_instruction=bloom_instruction,
        conversation_history=conversation_history
    )

    # Save both messages to conversation history
    response_text = gemini_response.get("text", "")
    await storage.save_message(
        request.student_id, "user", request.query,
        fatigue_state=context.fatigue_metric.status.value,
        blooms_level=context.pedagogical_state.blooms_level.value,
        topic=topic
    )
    await storage.save_message(
        request.student_id, "assistant", response_text,
        fatigue_state=context.fatigue_metric.status.value,
        blooms_level=context.pedagogical_state.blooms_level.value,
        topic=topic
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
async def reset_context(request: Request, student_id: str):
    await verify_student_auth(request, student_id)
    context = StudentContext(student_id=student_id)
    await storage.save_context(student_id, context)
    await storage.clear_history(student_id)
    return {"message": "Student context and history cleared", "context": context}


@app.get("/history/{student_id}")
async def get_history(request: Request, student_id: str, limit: int = Query(default=50, ge=1, le=200)):
    """Retrieve conversation history for a student."""
    await verify_student_auth(request, student_id)
    history = await storage.get_history(student_id, limit=limit)
    return {"student_id": student_id, "messages": history}


# ============================================
# GOOGLE AUTH ENDPOINTS
# ============================================

class GoogleLoginRequest(BaseModel):
    token: str = Field(..., description="Google ID token from frontend sign-in")

class MigrateRequest(BaseModel):
    old_student_id: str = Field(..., description="Anonymous student ID to migrate from")
    new_student_id: str = Field(..., description="Google-based student ID to migrate to")


class AccessCodeRequest(BaseModel):
    code: str

@app.post("/auth/verify-access")
async def verify_access_code(body: AccessCodeRequest):
    """
    Verify the site-wide access code securely on the backend.
    """
    received_code = body.code.strip().upper()
    expected_code = os.getenv("MAIT_ACCESS_CODE", "").strip().upper()
    
    # Secure fallbacks or removal of hardcoded codes should happen here
    if not expected_code:
        # If no code is set in environment, we might want a stricter policy
        raise HTTPException(status_code=500, detail="Access code not configured")

    if received_code == expected_code:
        return {"status": "success"}
    
    raise HTTPException(status_code=401, detail="Invalid access code")

@app.post("/auth/google")
async def google_login(body: GoogleLoginRequest):
    """
    Verify a Google ID token and return/create the associated student.
    If this Google account has logged in before, return the existing student_id
    so all history, context, and keystroke data persists.
    If new, create a user record with a stable student_id derived from the Google ID.
    """
    user_info = verify_google_token(body.token)
    if user_info is None:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = user_info["google_id"]

    # Check if user exists
    existing_user = await storage.get_user_by_google_id(google_id)
    if existing_user:
        # Update last login and profile info
        user = await storage.upsert_user(
            google_id=google_id,
            student_id=existing_user["student_id"],
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info["picture"],
        )
        return {
            "status": "existing",
            "student_id": user["student_id"],
            "user": user,
        }

    # New user — create stable student_id from Google sub
    student_id = f"google_{google_id}"
    user = await storage.upsert_user(
        google_id=google_id,
        student_id=student_id,
        email=user_info["email"],
        name=user_info["name"],
        picture=user_info["picture"],
    )
    return {
        "status": "new",
        "student_id": student_id,
        "user": user,
    }


@app.post("/auth/migrate")
async def migrate_student_data(body: MigrateRequest):
    """
    Migrate data from an anonymous student_id to a Google-based student_id.
    This transfers conversation history, student context, and keystroke data
    so nothing is lost when a student logs in with Google for the first time.
    """
    old_id = body.old_student_id
    new_id = body.new_student_id

    if old_id == new_id:
        return {"status": "no_migration_needed"}

    # Check if old student has any data
    old_context = await storage.get_context(old_id)
    new_context = await storage.get_context(new_id)

    migrated = []

    # Migrate context (only if new student has no context yet)
    if old_context and not new_context:
        old_context.student_id = new_id
        await storage.save_context(new_id, old_context)
        migrated.append("context")

    # Migrate conversation history
    old_history = await storage.get_history(old_id, limit=200)
    if old_history:
        for msg in old_history:
            await storage.save_message(
                new_id, msg["role"], msg["content"],
                fatigue_state=msg.get("fatigue_state"),
                blooms_level=msg.get("blooms_level"),
                topic=msg.get("topic"),
            )
        await storage.clear_history(old_id)
        migrated.append("conversation_history")

    return {
        "status": "migrated",
        "migrated": migrated,
        "old_student_id": old_id,
        "new_student_id": new_id,
    }


@app.get("/auth/me/{student_id}")
async def get_user_profile(student_id: str):
    """Get the user profile associated with a student_id."""
    user = await storage.get_user_by_student_id(student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


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
@limiter.limit("5/minute")
async def generate_worksheet(request: Request, body: WorksheetRequest):
    """
    Generate a NESA-styled maths worksheet PDF.

    Accepts a WorksheetRequest body and returns the compiled PDF file.
    The pipeline: WorksheetRequest -> Gemini (LaTeX) -> pdflatex -> PDF response.
    """
    pdf_path: Optional[str] = None
    try:
        pdf_path = await generate_worksheet_pdf(body)

        # Build a human-readable filename
        safe_topic = body.topic.replace(" ", "_").replace("/", "-")[:40]
        filename = f"worksheet_yr{body.year_level}_{safe_topic}.pdf"

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

@app.post("/visit")
async def record_visit():
    """Increment visit counter and return the new count."""
    try:
        count = await storage.increment_visit_count()
        return {"count": count}
    except Exception as e:
        return {"count": 0}


@app.post("/subscribe")
async def subscribe_waitlist(request: SubscribeRequest):
    """Save waitlist email to SQLite database."""
    try:
        await storage.save_email(request.email)
        return {"status": "success", "message": "Joined waitlist"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
