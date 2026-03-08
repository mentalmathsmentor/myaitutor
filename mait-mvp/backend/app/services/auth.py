"""
Google OAuth token verification and user management.
Verifies Google ID tokens and maps Google accounts to persistent student IDs.
"""

import os
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Google OAuth Client ID — set in .env
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


def verify_google_token(token: str) -> Optional[dict]:
    """
    Verify a Google ID token and return user info.

    Returns:
        dict with keys: sub, email, name, picture, email_verified
        or None if verification fails.
    """
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )

        # Verify the issuer
        if idinfo["iss"] not in ("accounts.google.com", "https://accounts.google.com"):
            return None

        return {
            "google_id": idinfo["sub"],
            "email": idinfo.get("email", ""),
            "name": idinfo.get("name", ""),
            "picture": idinfo.get("picture", ""),
            "email_verified": idinfo.get("email_verified", False),
        }
    except ValueError:
        return None
