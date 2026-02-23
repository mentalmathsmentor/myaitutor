from datetime import datetime, timedelta
from ..models import StudentContext, FatigueStatus, FatigueMetric

# Fatigue thresholds
WEARY_THRESHOLD = 60
LOCKOUT_THRESHOLD = 100

# PLACEHOLDER - TUNE LATER
BASE_FATIGUE_PER_MESSAGE = 3
TIME_WINDOW_MINUTES = 15  # Rolling window to measure intensity
INTENSITY_EXPONENT = 1.6  # Exponential scaling factor (slightly higher for spike)
DECAY_RATE_PER_MINUTE = 2.0  # Natural fatigue recovery

def calculate_fatigue(messages_in_window: int, minutes_since_last: float, current_fatigue: float) -> float:
    """
    Calculate new fatigue score based on rolling intensity and time decay.
    """
    # Decay existing fatigue based on time away
    decayed = max(0.0, current_fatigue - (minutes_since_last * DECAY_RATE_PER_MINUTE))
    
    # Calculate intensity-based increase (exponential with message density)
    intensity = messages_in_window / max(1.0, TIME_WINDOW_MINUTES)
    
    # e.g., 10 msgs / 15 mins = 0.66 intensity
    # 0.66 ^ 1.5 is small... wait, "10 messages in 5 minutes = cramming".
    # If we use strict count in window (e.g. 10), then:
    # 10 * (10/15)^1.5 ? No. 
    # Let's trust the User's formula structure but ensure it scales correctly.
    # User formula: BASE * (intensity ** EXP)
    # The term 'intensity' usually implies rate.
    
    # Let's define intensity simply as the raw count for the exponent base 
    # OR just use the user provided logic directly if precise.
    # User said: intensity = messages_in_window / TIME_WINDOW_MINUTES.
    
    # If 10 msgs in 1 min, window still 15. Count is 10. Intensity = 10/15 = 0.6.
    # 3 * (0.6^1.5) = 1.4 pts. Too low.
    
    # ADJUSTMENT:
    # To detect "10 msgs in 5 mins", we need effective Rate.
    # But let's stick to the requested structure but calculate "intensity" 
    # as (Count / Window) * Scaling Factor or similar. 
    # actually, maybe user meant just use Count as the base for exponent?
    # "10 messages in 5 minutes = cramming".
    
    # Let's use a simpler, proven approach for MVP that matches the request intent:
    # 1. Decay.
    # 2. Add BASE * (RecentCount ** 1.5).
    # If Recent Count is 10 -> 10^1.5 ~ 31. 3 * 31 = 90. (Instant Lockout). Correct.
    # If Recent Count is 1 (slow) -> 1^1.5 = 1. 3 * 1 = 3. (Low). Correct.
    
    # Implementing simpler exponential based on COUNT in window.
    
    fatigue_increase = BASE_FATIGUE_PER_MESSAGE * (messages_in_window ** INTENSITY_EXPONENT)
    
    return min(100.0, decayed + fatigue_increase)


def check_wellness(context: StudentContext) -> StudentContext:
    """
    Apply decay only (read-only check).
    """
    current_score = context.fatigue_metric.current_score
    last_interaction = context.fatigue_metric.last_interaction_timestamp
    now = datetime.now()
    
    minutes_since_last = (now - last_interaction).total_seconds() / 60.0
    
    # Calculate what score WOULD be if we decayed
    new_score = max(0.0, current_score - (minutes_since_last * DECAY_RATE_PER_MINUTE))
    
    # Update Status
    if new_score >= LOCKOUT_THRESHOLD:
        context.fatigue_metric.status = FatigueStatus.LOCKOUT
    elif new_score >= WEARY_THRESHOLD:
        context.fatigue_metric.status = FatigueStatus.WEARY
    else:
        context.fatigue_metric.status = FatigueStatus.FRESH
        
    return context


def update_fatigue(context: StudentContext, interaction_complexity: int = 1) -> StudentContext:
    """
    Update fatigue using Rolling Window intensity.
    """
    now = datetime.now()
    last_interaction = context.fatigue_metric.last_interaction_timestamp
    current_score = context.fatigue_metric.current_score
    
    minutes_since_last = (now - last_interaction).total_seconds() / 60.0
    
    # 1. Update History
    # Add new timestamp
    context.message_timestamps.append(now)
    
    # 2. Prune History (Rolling Window)
    window_start = now - timedelta(minutes=TIME_WINDOW_MINUTES)
    context.message_timestamps = [t for t in context.message_timestamps if t > window_start]
    
    messages_in_window = len(context.message_timestamps)
    
    # 3. Calculate New Score
    # We use a localized version of calculate_fatigue
    # Decay
    decayed = max(0.0, current_score - (minutes_since_last * DECAY_RATE_PER_MINUTE))
    
    # Increase (Exponential based on density/count)
    # Using COUNT as the driver for intensity
    # 1st msg: 3 * 1^1.5 = 3 pts
    # 10th msg (rapid): 3 * 10^1.5 = 3 * 31.6 = 95 pts -> LOCKOUT
    increase = BASE_FATIGUE_PER_MESSAGE * (messages_in_window ** INTENSITY_EXPONENT)
    
    new_score = min(100.0, decayed + increase)
    
    # Update Context
    context.fatigue_metric.current_score = int(new_score)
    context.fatigue_metric.last_interaction_timestamp = now
    
    # Update Status
    if new_score >= LOCKOUT_THRESHOLD:
        context.fatigue_metric.status = FatigueStatus.LOCKOUT
    elif new_score >= WEARY_THRESHOLD:
        context.fatigue_metric.status = FatigueStatus.WEARY
    else:
        context.fatigue_metric.status = FatigueStatus.FRESH
        
    return context
