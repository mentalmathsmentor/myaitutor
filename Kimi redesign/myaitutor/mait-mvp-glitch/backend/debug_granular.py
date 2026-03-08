print("1. Importing models...", flush=True)
from app.models import StudentContext
print("2. Importing gemini_client...", flush=True)
from app.services.gemini_client import get_gemini_response
print("3. Importing syllabus_service...", flush=True)
from app.services.syllabus_service import syllabus_service
print("4. Done.", flush=True)
