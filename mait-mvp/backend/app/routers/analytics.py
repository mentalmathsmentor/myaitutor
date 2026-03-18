import os
from datetime import datetime

from fastapi import APIRouter

from ..models import KeystrokeSubmission, KeystrokeProfile
from ..services import storage
from ..deps import get_or_create_context

router = APIRouter(tags=["analytics"])


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


@router.post("/keystroke-metrics")
async def submit_keystroke_metrics(submission: KeystrokeSubmission):
    """Submit keystroke metrics for a typing session."""
    context = await get_or_create_context(submission.student_id)
    profile = context.keystroke_profile
    metrics = submission.metrics

    total_sessions = profile.total_sessions + 1

    if total_sessions == 1:
        profile.average_wpm = metrics.wpm
        profile.average_dwell_time_ms = metrics.avg_dwell_time_ms
        profile.average_flight_time_ms = metrics.avg_flight_time_ms
        profile.average_thinking_time_ms = metrics.avg_thinking_time_ms
    else:
        weight = 1 / total_sessions
        prev_weight = 1 - weight
        profile.average_wpm = round(prev_weight * profile.average_wpm + weight * metrics.wpm, 1)
        profile.average_dwell_time_ms = round(prev_weight * profile.average_dwell_time_ms + weight * metrics.avg_dwell_time_ms, 1)
        profile.average_flight_time_ms = round(prev_weight * profile.average_flight_time_ms + weight * metrics.avg_flight_time_ms, 1)
        profile.average_thinking_time_ms = round(prev_weight * profile.average_thinking_time_ms + weight * metrics.avg_thinking_time_ms, 1)

    profile.total_sessions = total_sessions
    profile.total_characters_typed += metrics.characters_typed
    profile.total_error_corrections += metrics.error_corrections
    profile.typing_rhythm_variance = metrics.rhythm_variance
    profile.last_updated = datetime.now()

    recent_timestamps = [ts for ts in context.message_timestamps
                        if (datetime.now() - ts).total_seconds() < 900]
    profile.message_frequency_per_minute = round(len(recent_timestamps) / 15, 2)

    profile.typing_speed_category = classify_typing_speed(profile.average_wpm)
    profile.consistency_category = classify_consistency(profile.typing_rhythm_variance)
    profile.thinking_pattern = classify_thinking_pattern(profile.average_thinking_time_ms)
    profile.error_tendency = classify_error_tendency(
        profile.total_error_corrections,
        profile.total_characters_typed
    )

    profile.session_history = profile.session_history[-49:] + [metrics]

    context.keystroke_profile = profile
    await storage.save_context(submission.student_id, context)

    return {"status": "success", "profile": profile}


@router.get("/keystroke-profile/{student_id}")
async def get_keystroke_profile(student_id: str):
    """Get the keystroke psychometric profile for a student."""
    context = await get_or_create_context(student_id)
    return {"student_id": student_id, "profile": context.keystroke_profile}


@router.delete("/keystroke-profile/{student_id}")
async def reset_keystroke_profile(student_id: str):
    """Reset keystroke profile for a student."""
    context = await get_or_create_context(student_id)
    context.keystroke_profile = KeystrokeProfile()
    await storage.save_context(student_id, context)
    return {"status": "success", "message": "Keystroke profile reset"}


@router.post("/visit")
async def record_visit():
    """Increment visit counter and return the new count."""
    try:
        count = await storage.increment_visit_count()
        return {"count": count}
    except Exception:
        return {"count": 0}


@router.get("/visits")
async def get_visits():
    if not os.path.exists("data/visits.log"):
        return {"count": 0}
    with open("data/visits.log") as f:
        return {"count": len(f.readlines())}
