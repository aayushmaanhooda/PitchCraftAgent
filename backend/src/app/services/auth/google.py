"""Google OAuth2 sign-in flow."""

import secrets
from urllib.parse import urlencode

import bcrypt
import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from core.config import get_settings

settings = get_settings()
from schemas.tables import User
from services.auth.auth_service import get_user_by_email, get_user_by_username

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

OAUTH_SCOPES = ["openid", "email", "profile"]


class GoogleUserInfo(BaseModel):
    sub: str
    email: str
    email_verified: bool = False
    name: str | None = None
    given_name: str | None = None
    picture: str | None = None


def build_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(OAUTH_SCOPES),
        "access_type": "online",
        "include_granted_scopes": "true",
        "prompt": "select_account",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_userinfo(code: str) -> GoogleUserInfo:
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Google token exchange failed: {token_resp.text}",
            )
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "No access_token returned from Google"
            )

        ui_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if ui_resp.status_code != 200:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Google userinfo failed: {ui_resp.text}",
            )
        return GoogleUserInfo(**ui_resp.json())


def _unique_username(session: Session, base: str) -> str:
    base = "".join(c for c in base if c.isalnum() or c in ("_", "-")) or "user"
    base = base[:40] or "user"
    if not get_user_by_username(session, base):
        return base
    for _ in range(20):
        candidate = f"{base}-{secrets.token_hex(2)}"
        if not get_user_by_username(session, candidate):
            return candidate
    raise HTTPException(
        status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not pick a username"
    )


def google_sign_in(session: Session, userinfo: GoogleUserInfo) -> User:
    """Upsert — return existing user by email, else create one."""
    existing = get_user_by_email(session, userinfo.email)
    if existing:
        return existing

    base_username = (
        userinfo.given_name
        or (userinfo.name.split(" ")[0] if userinfo.name else None)
        or userinfo.email.split("@")[0]
    )
    username = _unique_username(session, base_username.lower())

    # Google users don't have a local password — store a random unusable hash
    random_secret = secrets.token_urlsafe(32).encode("utf-8")
    hashed = bcrypt.hashpw(random_secret, bcrypt.gensalt()).decode("utf-8")

    user = User(
        username=username,
        email=userinfo.email,
        hashed_password=hashed,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
