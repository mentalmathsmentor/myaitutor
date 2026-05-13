import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..deps import get_current_student_id
from ..services import storage
from ..services.auth import verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    token: str = Field(..., description="Google ID token from frontend sign-in")


class MigrateRequest(BaseModel):
    old_student_id: str = Field(..., description="Anonymous student ID to migrate from")
    new_student_id: str = Field(..., description="Google-based student ID to migrate to")


class AccessCodeRequest(BaseModel):
    code: str


@router.post("/verify-access")
async def verify_access_code(body: AccessCodeRequest):
    """Verify the site-wide access code securely on the backend."""
    received_code = body.code.strip().upper()
    expected_code = os.getenv("MAIT_ACCESS_CODE", "HSCMATE2026").strip().upper()

    print(f"DEBUG AUTH: Received '{received_code}', Expected '{expected_code}'")

    if received_code == expected_code:
        return {"status": "success"}

    raise HTTPException(status_code=401, detail="Invalid access code")


@router.post("/google")
async def google_login(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify a Google ID token and return/create the associated student.
    """
    user_info = verify_google_token(body.token)
    if user_info is None:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = user_info["google_id"]

    existing_user = await storage.get_user_by_google_id(db, google_id)
    if existing_user:
        user = await storage.upsert_user(
            db,
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

    student_id = f"google_{google_id}"
    user = await storage.upsert_user(
        db,
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


@router.post("/migrate")
async def migrate_student_data(body: MigrateRequest, db: AsyncSession = Depends(get_db)):
    # Endpoint disabled pending JWT migration.
    raise HTTPException(status_code=410, detail="Student migration is disabled")


@router.get("/me/{student_id}")
async def get_user_profile(
    student_id: str,
    current_student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the user profile associated with a student_id."""
    if student_id != current_student_id:
        raise HTTPException(status_code=404, detail="User not found")
    user = await storage.get_user_by_student_id(db, student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
