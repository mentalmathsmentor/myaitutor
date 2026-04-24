import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
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
    """Migrate data from an anonymous student_id to a Google-based student_id."""
    old_id = body.old_student_id
    new_id = body.new_student_id

    if old_id == new_id:
        return {"status": "no_migration_needed"}

    old_context = await storage.get_context(db, old_id)
    new_context = await storage.get_context(db, new_id)

    migrated = []

    if old_context and not new_context:
        old_context.student_id = new_id
        await storage.save_context(db, new_id, old_context)
        migrated.append("context")

    old_history = await storage.get_history(db, old_id, limit=200)
    if old_history:
        for msg in old_history:
            await storage.save_message(
                db,
                new_id, msg["role"], msg["content"],
                fatigue_state=msg.get("fatigue_state"),
                blooms_level=msg.get("blooms_level"),
                topic=msg.get("topic"),
            )
        await storage.clear_history(db, old_id)
        migrated.append("conversation_history")

    return {
        "status": "migrated",
        "migrated": migrated,
        "old_student_id": old_id,
        "new_student_id": new_id,
    }


@router.get("/me/{student_id}")
async def get_user_profile(student_id: str, db: AsyncSession = Depends(get_db)):
    """Get the user profile associated with a student_id."""
    user = await storage.get_user_by_student_id(db, student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
