import sys
import os

# Mock the environment variable for gemini so it doesn't crash if missing
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY", "dummy_key")

print("Starting app imports check...", flush=True)

try:
    from app.services import educational_agent
    print("educational_agent imported successfully!", flush=True)
except ImportError as e:
    print(f"Error importing educational_agent: {e}", flush=True)
except Exception as e:
    print(f"Unexpected error: {e}", flush=True)

try:
    from app.main import app
    print("app.main imported successfully!", flush=True)
except Exception as e:
    print(f"Error importing app.main: {e}", flush=True)

print("Done checking imports.", flush=True)
