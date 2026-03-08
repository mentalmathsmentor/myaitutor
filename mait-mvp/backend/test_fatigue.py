import asyncio
from datetime import datetime, timedelta
from app.services import wellness_engine
from app.models import StudentContext, FatigueMetric, FatigueStatus

def test_fast_spam():
    print("\n--- TEST: Fast Spam (Rolling Window) ---")
    ctx = StudentContext(student_id="spammer", fatigue_metric=FatigueMetric())
    
    # Start fresh
    print(f"Initial: {ctx.fatigue_metric.current_score}")
    
    # 10 msg in roughly 0 time
    for i in range(10):
        ctx = wellness_engine.update_fatigue(ctx, interaction_complexity=2)
        print(f"Msg {i+1}: Score {ctx.fatigue_metric.current_score}")
        
    if ctx.fatigue_metric.current_score >= 80:
        print("✅ SUCCESS: Rolling window detected high intensity (Spike > 80)")
    else:
        print(f"❌ FAILURE: Fatigue too low ({ctx.fatigue_metric.current_score})")

def test_slow_pace():
    print("\n--- TEST: Slow Pace (Healthy) ---")
    ctx = StudentContext(student_id="learner", fatigue_metric=FatigueMetric())
    
    # 10 msg spread over 60 mins (1 msg every 6 mins)
    # 1. Update (Fresh) -> +3
    # 2. Wait 6 mins -> Decay 12pts -> Back to 0. Update -> +3
    # Result: Score should stay very low (< 20)
    
    now = datetime.now()
    ctx.fatigue_metric.last_interaction_timestamp = now - timedelta(hours=1)
    
    for i in range(10):
        # Move clock forward 6 mins
        # We have to mock the timestamp in context AND the "now" inside wellness_engine
        # Since we can't easily mock datetime.now() without a library override for the service,
        # we will simulate it by manipulating the LAST interaction time relative to real NOW.
        # Logic: If I want to simulate "6 mins passed", I set last_interaction to (Now - 6 mins).
        
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=6)
        
        # BUT rolling window checks timestamps in list. We need to backfill those too.
        # For this test, we assume previous messages were old enough to be pruned or spaced.
        # If we spam update_fatigue, it adds 'now' to list.
        # We need to manually fix the list timestamps to be in the past.
        
        # Simulating step:
        ctx = wellness_engine.update_fatigue(ctx, interaction_complexity=2)
        
        # Hack: Move the just-added timestamp back in time
        ctx.message_timestamps[-1] = datetime.now() - timedelta(minutes=5) 
        # Making it 5 mins ago means it stays in window (15m) for a bit
        
        print(f"Msg {i+1} (Slow): Score {ctx.fatigue_metric.current_score}")
        
    if ctx.fatigue_metric.current_score < 40:
        print("✅ SUCCESS: Slow pace kept fatigue low")
    else:
        print(f"❌ FAILURE: Fatigue grew too high ({ctx.fatigue_metric.current_score})")

if __name__ == "__main__":
    test_fast_spam()
    test_slow_pace()
