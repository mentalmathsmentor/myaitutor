import sys
print("Starting imports...", flush=True)

try:
    import fastapi
    print("fastapi imported", flush=True)
except ImportError as e:
    print(f"Error importing fastapi: {e}", flush=True)

try:
    from fastapi.middleware.cors import CORSMiddleware
    print("cors imported", flush=True)
except ImportError as e:
    print(f"Error importing cors: {e}", flush=True)

try:
    from pydantic import BaseModel, Field
    print("pydantic imported", flush=True)
except ImportError as e:
    print(f"Error importing pydantic: {e}", flush=True)

try:
    from dotenv import load_dotenv
    print("dotenv imported", flush=True)
    load_dotenv()
    print("env loaded", flush=True)
except ImportError as e:
    print(f"Error importing dotenv: {e}", flush=True)

try:
    from app.models import StudentContext, FatigueStatus
    print("models imported", flush=True)
except ImportError as e:
    print(f"Error importing models: {e}", flush=True)

try:
    print("Importing chromadb...", flush=True)
    import chromadb
    print("chromadb imported", flush=True)
except ImportError as e:
    print(f"Error importing chromadb: {e}", flush=True)

# These services might have heavy dependencies
try:
    from app.services import wellness_engine
    print("wellness_engine imported", flush=True)
except ImportError as e:
    print(f"Error importing wellness_engine: {e}", flush=True)

try:
    from app.services import educational_agent
    print("educational_agent imported", flush=True)
except ImportError as e:
    print(f"Error importing educational_agent: {e}", flush=True)

try:
    from app.services.syllabus_service import syllabus_service
    print("syllabus_service imported", flush=True)
except ImportError as e:
    print(f"Error importing syllabus_service: {e}", flush=True)

print("All imports finished!", flush=True)
