import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request


DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30


def _get_secret() -> bytes:
    secret = os.getenv("MAIT_SESSION_SECRET") or os.getenv("GEMINI_API_KEY") or "mait-dev-session-secret"
    return secret.encode("utf-8")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def create_session_token(
    student_id: str,
    kind: str = "anonymous",
    google_id: Optional[str] = None,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> str:
    payload: Dict[str, Any] = {
        "sub": student_id,
        "kind": kind,
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl_seconds,
    }
    if google_id:
        payload["google_id"] = google_id

    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(_get_secret(), payload_bytes, hashlib.sha256).digest()
    return f"{_b64url_encode(payload_bytes)}.{_b64url_encode(signature)}"


def verify_session_token(token: str) -> Dict[str, Any]:
    try:
        payload_part, signature_part = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid session token.") from exc

    payload_bytes = _b64url_decode(payload_part)
    expected_signature = hmac.new(_get_secret(), payload_bytes, hashlib.sha256).digest()
    received_signature = _b64url_decode(signature_part)

    if not hmac.compare_digest(expected_signature, received_signature):
        raise HTTPException(status_code=401, detail="Invalid session token signature.")

    payload = json.loads(payload_bytes.decode("utf-8"))
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Session expired.")

    return payload


def get_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


async def require_session(request: Request) -> Dict[str, Any]:
    token = get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token.")
    claims = verify_session_token(token)
    request.state.session_claims = claims
    return claims


async def require_student_session(request: Request, student_id: Optional[str] = None) -> Dict[str, Any]:
    claims = await require_session(request)
    if student_id and claims.get("sub") != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized: session does not match student.")
    return claims
