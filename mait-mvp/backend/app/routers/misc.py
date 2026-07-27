import logging
import os

import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ..db.session import get_db
from ..deps import limiter
from ..services import storage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["misc"])


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
        logger.error("RESEND_API_KEY is not set; cannot dispatch feedback email")
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

        return {"status": "success", "id": r.get('id')}
    except Exception:
        logger.exception("Failed to send feedback email")
        raise HTTPException(status_code=500, detail="Failed to dispatch feedback email")


class SubscribeRequest(BaseModel):
    email: str


@router.post("/subscribe")
async def subscribe_waitlist(body: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    """Save waitlist email to Postgres."""
    try:
        await storage.save_email(db, body.email)
    except Exception:
        # Previously this returned {"status": "error"} with HTTP 200, so the
        # frontend's `res.ok` check treated failures as success. Propagate a
        # real 5xx so the client can detect and surface the failure.
        logger.exception("Failed to save waitlist email")
        raise HTTPException(status_code=500, detail="Failed to join waitlist")
    return {"status": "success", "message": "Joined waitlist"}
