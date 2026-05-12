import logging
import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..services import storage
from ..services.auth import verify_google_token
from ..deps import get_or_create_context
from ..logging_config import hash_identifier, log_event, request_context

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class GoogleLoginRequest(BaseModel):
    token: str = Field(..., description="Google ID token from frontend sign-in")


class MigrateRequest(BaseModel):
    old_student_id: str = Field(..., description="Anonymous student ID to migrate from")
    new_student_id: str = Field(..., description="Google-based student ID to migrate to")


class AccessCodeRequest(BaseModel):
    code: str


@router.post("/verify-access")
async def verify_access_code(request: Request, body: AccessCodeRequest):
    """Verify the site-wide access code securely on the backend."""
    received_code = body.code.strip().upper()
    expected_code = os.getenv("MAIT_ACCESS_CODE", "HSCMATE2026").strip().upper()

    if received_code == expected_code:
        log_event(
            logger,
            "auth_event",
            action="access_code_verified",
            success=True,
            source="access_code",
            **request_context(request),
        )
        return {"status": "success"}

    log_event(
        logger,
        "auth_event",
        level=logging.WARNING,
        action="access_code_failed",
        success=False,
        source="access_code",
        **request_context(request),
    )
    raise HTTPException(status_code=401, detail="Invalid access code")


@router.post("/google")
async def google_login(request: Request, body: GoogleLoginRequest):
    """
    Verify a Google ID token and return/create the associated student.
    """
    user_info = verify_google_token(body.token)
    if user_info is None:
        log_event(
            logger,
            "auth_event",
            level=logging.WARNING,
            action="google_login_failed",
            success=False,
            source="google",
            **request_context(request),
        )
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = user_info["google_id"]

    existing_user = await storage.get_user_by_google_id(google_id)
    if existing_user:
        user = await storage.upsert_user(
            google_id=google_id,
            student_id=existing_user["student_id"],
            email=user_info["email"],
            name=user_info["name"],
            picture=user_info["picture"],
        )
        log_event(
            logger,
            "auth_event",
            action="google_login_success",
            success=True,
            source="google",
            login_student_id_hash=hash_identifier(user["student_id"]),
            google_id_hash=hash_identifier(google_id),
            email_hash=hash_identifier(user_info.get("email")),
            user_status="existing",
            **request_context(request),
        )
        return {
            "status": "existing",
            "student_id": user["student_id"],
            "user": user,
        }

    student_id = f"google_{google_id}"
    user = await storage.upsert_user(
        google_id=google_id,
        student_id=student_id,
        email=user_info["email"],
        name=user_info["name"],
        picture=user_info["picture"],
    )
    log_event(
        logger,
        "auth_event",
        action="google_login_success",
        success=True,
        source="google",
        login_student_id_hash=hash_identifier(student_id),
        google_id_hash=hash_identifier(google_id),
        email_hash=hash_identifier(user_info.get("email")),
        user_status="new",
        **request_context(request),
    )
    return {
        "status": "new",
        "student_id": student_id,
        "user": user,
    }


@router.post("/migrate")
async def migrate_student_data(request: Request, body: MigrateRequest):
    """Migrate data from an anonymous student_id to a Google-based student_id."""
    old_id = body.old_student_id
    new_id = body.new_student_id

    if old_id == new_id:
        log_event(
            logger,
            "auth_event",
            action="student_data_migration_skipped",
            success=True,
            old_student_id_hash=hash_identifier(old_id),
            new_student_id_hash=hash_identifier(new_id),
            **request_context(request),
        )
        return {"status": "no_migration_needed"}

    old_context = await storage.get_context(old_id)
    new_context = await storage.get_context(new_id)

    migrated = []

    if old_context and not new_context:
        old_context.student_id = new_id
        await storage.save_context(new_id, old_context)
        migrated.append("context")

    old_history = await storage.get_history(old_id, limit=200)
    if old_history:
        for msg in old_history:
            await storage.save_message(
                new_id, msg["role"], msg["content"],
                fatigue_state=msg.get("fatigue_state"),
                blooms_level=msg.get("blooms_level"),
                topic=msg.get("topic"),
            )
        await storage.clear_history(old_id)
        migrated.append("conversation_history")

    log_event(
        logger,
        "auth_event",
        action="student_data_migrated",
        success=True,
        old_student_id_hash=hash_identifier(old_id),
        new_student_id_hash=hash_identifier(new_id),
        migrated=migrated,
        **request_context(request),
    )
    return {
        "status": "migrated",
        "migrated": migrated,
        "old_student_id": old_id,
        "new_student_id": new_id,
    }


@router.get("/me/{student_id}")
async def get_user_profile(student_id: str):
    """Get the user profile associated with a student_id."""
    user = await storage.get_user_by_student_id(student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
