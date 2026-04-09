import os

import resend
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ..deps import limiter
from ..services import storage

router = APIRouter(tags=["misc"])


@router.get("/")
def read_root():
    return {"status": "online", "system": "MAIT MVP"}


class FeedbackRequest(BaseModel):
    message: str
    email: Optional[str] = "anonymous"
    context: Optional[str] = "unknown"


@router.post("/api/feedback")
@limiter.limit("5/minute")
async def submit_feedback(request: Request, body: FeedbackRequest):
    """Handle user feedback via the frontend forms."""
    resend_api_key = os.getenv("RESEND_API_KEY")
    if not resend_api_key:
        print("[Feedback] RESEND_API_KEY is not set.")
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
            "to": "mentor@mentalmaths.au",
            "subject": f"MAIT Feedback: {body.context}",
            "html": html_content
        })

        return {"status": "success", "id": r.get('id')}
    except Exception as e:
        print(f"[Feedback] Failed to send email: {e}")
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
