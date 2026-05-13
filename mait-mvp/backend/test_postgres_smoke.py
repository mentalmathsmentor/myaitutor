import pytest
import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

# Import app components
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.db.session import async_session_maker, engine
from app.db.models import User, Document, DocumentElement

@pytest.fixture(scope="session")
def event_loop():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.mark.asyncio
async def test_postgres_smoke():
    from app.db.session import DATABASE_URL
    print(f"\n[0/5] Using DATABASE_URL: {DATABASE_URL}")
    student_id = f"test-student-{uuid.uuid4().hex[:8]}"
    google_id = f"google-{uuid.uuid4().hex[:8]}"
    
    print(f"\n[1/5] Creating dummy user: {student_id}")
    async with async_session_maker() as session:
        user = User(
            google_id=google_id,
            student_id=student_id,
            email=f"{student_id}@example.com",
            name="Smoke Test User"
        )
        session.add(user)
        await session.commit()

    # Mock response for parse_monolithic_latex to ensure we get predictable elements
    mock_latex = r"""\section{Calculus Intro}
Here is a derivative: $d/dx(x^2) = 2x$.
\section{Practice Problems}
1. Solve for x."""

    print("[2/5] Mocking LLM and testing POST /canvas/generate")
    with patch("app.routers.canvas.generate_worksheet_latex", return_value=mock_latex):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "student_id": student_id,
                "worksheet_request": {
                    "requestVersion": "v1.0",
                    "worksheetSettings": {
                        "course": "Mathematics Advanced",
                        "subject": "Mathematics",
                        "difficulty": "Year 12",
                        "numberOfQuestions": 5,
                        "headerSpaces": "Standard",
                        "workingSpace": "2cm",
                        "marks": "Show Marks",
                        "answerKey": "Include",
                        "watermark": True,
                        "mode": "PEDAGOGY"
                    },
                    "topicSummary": "Introduction to Derivatives",
                    "syllabusPacket": {
                        "topicSummary": "Derivatives",
                        "outcomes": ["MS-C1"],
                        "dotPoints": ["C1.1"],
                        "include": ["power rule"],
                        "exclude": ["trig derivatives"],
                        "assessmentEmphasis": ["procedural fluency"],
                        "questionStyleNotes": ["standard exam style"]
                    },
                    "pedagogicalDrills": ["Spot the Error"],
                    "customInstructions": "Focus on the power rule.",
                    "legacyFields": {
                        "manual_prompt": "",
                        "context_source": ""
                    }
                }
            }
            # verify_student_auth checks X-Student-Id header
            headers = {"X-Student-Id": student_id}
            
            response = await ac.post("/canvas/generate", json=payload, headers=headers)
            assert response.status_code == 200, f"POST Failed: {response.text}"
            
            data = response.json()
            doc_id_str = data["document"]["id"] # This is the public_id
            elements = data["elements"]
            
            print(f"      - Generated Document (Public ID): {doc_id_str}")
            print(f"      - Generated Elements: {len(elements)}")
            
            assert len(elements) >= 1, "Should have generated at least one element"

            print("[3/5] Verifying DB persistence via raw query")
            async with async_session_maker() as session:
                # Check Document using public_id
                stmt = select(Document).where(Document.public_id == doc_id_str)
                res = await session.execute(stmt)
                db_doc = res.scalar_one_or_none()
                assert db_doc is not None
                assert db_doc.student_id == student_id
                
                # Check Elements using the actual UUID primary key from db_doc
                stmt = select(DocumentElement).where(DocumentElement.document_id == db_doc.id)
                res = await session.execute(stmt)
                db_elements = res.scalars().all()
                assert len(db_elements) == len(elements)
                print(f"      - Verified {len(db_elements)} elements in Postgres.")

            print(f"[4/5] Testing GET /canvas/documents/{doc_id_str}")
            get_response = await ac.get(f"/canvas/documents/{doc_id_str}", headers=headers)
            assert get_response.status_code == 200
            get_data = get_response.json()
            assert get_data["document"]["id"] == doc_id_str
            assert len(get_data["elements"]) == len(elements)
            print("      - GET verification successful.")

            print("[5/5] Cleaning up test data")
            async with async_session_maker() as session:
                # CASCADE delete should handle elements, but we'll be explicit if needed
                if db_doc:
                    await session.execute(delete(Document).where(Document.id == db_doc.id))
                await session.execute(delete(User).where(User.student_id == student_id))
                await session.commit()
            print("      - Cleanup complete.")

if __name__ == "__main__":
    # If run directly, use pytest
    import sys
    import pytest
    sys.exit(pytest.main([__file__, "-v", "-s"]))
