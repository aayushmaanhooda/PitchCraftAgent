import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from core.config import get_settings
from core.db import get_session
from schemas.auth import LoginRequest, RegisterRequest, UserRead
from schemas.tables import User
from services.auth.auth_service import (
    authenticate_user,
    get_current_user,
    register_user,
)
from services.auth.google import (
    build_authorization_url,
    exchange_code_for_userinfo,
    google_sign_in,
)
from services.auth.jwt import create_access_token


settings = get_settings()
OAUTH_STATE_COOKIE = "google_oauth_state"

# Cross-site cookies (prod: frontend on vercel, backend on fastapicloud) need
# SameSite=None + Secure. In dev (http), browsers reject SameSite=None, so we
# fall back to "lax". Driven by COOKIE_SECURE so the two settings stay in sync.
_COOKIE_SAMESITE: str = "none" if settings.COOKIE_SECURE else "lax"

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, user_id: int) -> None:
    token = create_access_token(user_id)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    session: Session = Depends(get_session),
) -> User:
    user = register_user(session, payload)
    _set_auth_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserRead)
def login(
    payload: LoginRequest,
    response: Response,
    session: Session = Depends(get_session),
) -> User:
    user = authenticate_user(session, payload.email, payload.password)
    _set_auth_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ---- Google OAuth ----


@router.get("/google/login")
def google_login() -> RedirectResponse:
    state = secrets.token_urlsafe(24)
    url = build_authorization_url(state)
    response = RedirectResponse(url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        max_age=600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    session: Session = Depends(get_session),
) -> RedirectResponse:
    if error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Google error: {error}")
    if not code or not state:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing code or state")

    expected_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")

    userinfo = await exchange_code_for_userinfo(code)
    user = google_sign_in(session, userinfo)

    redirect = RedirectResponse(
        f"{settings.FRONTEND_URL}/dashboard", status_code=status.HTTP_302_FOUND
    )
    token = create_access_token(user.id)
    redirect.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    redirect.delete_cookie(OAUTH_STATE_COOKIE, path="/")
    return redirect
