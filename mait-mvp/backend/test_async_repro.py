import asyncio
import time
from app.main import interact, InteractionRequest, sessions, get_context
from app.models import StudentContext, FatigueStatus
from unittest.mock import patch, MagicMock

# Mock the expensive AI call
async def mock_generate_response_async(query, context):
    await asyncio.sleep(1.0) # Simulate 1s latency
    return "Mocked Response"

async def test_concurrency():
    print("--- Testing Concurrency ---")
    
    # Patch the educational_agent
    with patch('app.services.educational_agent.generate_response_async', side_effect=mock_generate_response_async):
        req = InteractionRequest(student_id="concurrent_user", query="test")
        
        start_time = time.time()
        # Launch 3 requests
        tasks = [
            interact(req),
            interact(req),
            interact(req)
        ]
        
        await asyncio.gather(*tasks)
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"3 requests took {duration:.2f} seconds.")
        if duration < 1.5:
            print("SUCCESS: Requests processed successfully in parallel (approx).")
        # Note: Since interact() awaits generate_response_async, provided the event loop is running, 
        # legitimate async calls should be concurrent.
        # However, FastAPI's dependency injection isn't active here, but we aren't using deps in interact().
        else:
             print("WARNING: Requests might be sequential.")

async def test_state_isolation():
    print("\n--- Testing State Isolation ---")
    
    # Reset sessions
    sessions.clear()
    
    user1_id = "user_A"
    user2_id = "user_B"
    
    # User A interacts heavily to trigger lockout
    # LOCKOUT is 90. Increase is 5 * complexity.
    # Complexity 20 -> 100 points -> Instant Lockout
    
    req_a = InteractionRequest(student_id=user1_id, query="hard work", complexity=20)
    await interact(req_a)
    
    ctx_a = get_context(user1_id)
    print(f"User A Status: {ctx_a.fatigue_metric.status}")
    
    if ctx_a.fatigue_metric.status != FatigueStatus.LOCKOUT:
        print("FAILURE: User A should be locked out but is not.")
    
    # User B interacts lightly
    req_b = InteractionRequest(student_id=user2_id, query="easy work", complexity=1)
    await interact(req_b)
    
    ctx_b = get_context(user2_id)
    print(f"User B Status: {ctx_b.fatigue_metric.status}")
    
    if ctx_b.fatigue_metric.status == FatigueStatus.FRESH:
         print("SUCCESS: User B is FRESH despite User A being LOCKED OUT.")
    else:
         print(f"FAILURE: User B is {ctx_b.fatigue_metric.status}. Session leak detected.")

async def main():
    await test_concurrency()
    await test_state_isolation()

if __name__ == "__main__":
    asyncio.run(main())
