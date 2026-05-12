import logging
import os

import resend
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ..deps import limiter
from ..logging_config import hash_identifier, log_event, request_context, text_preview
from ..services import storage

router = APIRouter(tags=["misc"])
logger = logging.getLogger(__name__)


@router.get("/")
def read_root():
    return {"status": "online", "system": "MAIT MVP"}


class FeedbackRequest(BaseModel):
    message: str
    email: Optional[str] = "anonymous"
    context: Optional[str] = "unknown"


@router.post("/api/feedback")
@limiter.limit("1/minute")
async def submit_feedback(request: Request, body: FeedbackRequest):
    """Handle user feedback via the frontend forms."""
    resend_api_key = os.getenv("RESEND_API_KEY")
    if not resend_api_key:
        log_event(
            logger,
            "feedback_error",
            level=logging.ERROR,
            message="RESEND_API_KEY is not set",
            context=body.context,
            email_hash=hash_identifier(body.email),
            **request_context(request),
        )
        raise HTTPException(status_code=500, detail="Email service configuration error")

    resend.api_key = resend_api_key

    try:
        html_content = f"""
        <h2>New MAIT Feedback Received</h2>
        <p><strong>Context:</strong> {body.context}</p>
        <p><strong>User Email:</strong> {body.email}</p>
        <hr>
        <h3>Message:</h3>
        <p>{body.message.replace(chr(10), '<br>')}</p>
        """

        r = resend.Emails.send({
            "from": "MAIT System <onboarding@resend.dev>",
            "to": "work.daray@gmail.com",
            "subject": f"MAIT Feedback: {body.context}",
            "html": html_content
        })

        log_event(
            logger,
            "feedback_sent",
            context=body.context,
            email_hash=hash_identifier(body.email),
            feedback=text_preview(body.message),
            resend_id=r.get("id"),
            **request_context(request),
        )
        return {"status": "success", "id": r.get('id')}
    except Exception as e:
        log_event(
            logger,
            "feedback_error",
            level=logging.ERROR,
            error_type=type(e).__name__,
            error_message=str(e),
            context=body.context,
            email_hash=hash_identifier(body.email),
            **request_context(request),
        )
        raise HTTPException(status_code=500, detail="Failed to dispatch feedback email")


class SubscribeRequest(BaseModel):
    email: str


@router.post("/subscribe")
async def subscribe_waitlist(request: SubscribeRequest):
    """Save waitlist email to SQLite database."""
    try:
        await storage.save_email(request.email)
        return {"status": "success", "message": "Joined waitlist"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
