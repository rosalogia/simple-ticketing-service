from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from ..config import (
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DISCORD_REDIRECT_URI_MOBILE,
    is_dev_mode,
)
from ..database import get_db
from ..models import Session, User
from ..schemas import AuthStatusResponse, UserResponse

router = APIRouter()

DISCORD_API = "https://discord.com/api/v10"


@router.get("/login")
def login():
    if is_dev_mode():
        raise HTTPException(404, "Auth disabled in dev mode")
    params = urlencode(
        {
            "client_id": DISCORD_CLIENT_ID,
            "redirect_uri": DISCORD_REDIRECT_URI,
            "response_type": "code",
            "scope": "identify guilds",
        }
    )
    return {"url": f"https://discord.com/oauth2/authorize?{params}"}


@router.get("/callback")
async def callback(code: str, request: Request, db: DBSession = Depends(get_db)):
    if is_dev_mode():
        raise HTTPException(404, "Auth disabled in dev mode")

    # Exchange code for access token
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(400, "Failed to exchange code for token")
        token_data = token_resp.json()

        # Fetch Discord user info
        user_resp = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={
                "Authorization": f"Bearer {token_data['access_token']}"
            },
        )
        if user_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch Discord user")
        discord_user = user_resp.json()

    # Find or create STS user
    discord_id = str(discord_user["id"])
    user = db.query(User).filter(User.discord_id == discord_id).first()

    avatar_url = None
    if discord_user.get("avatar"):
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png"

    if user:
        # Update display name and avatar on each login
        user.display_name = (
            discord_user.get("global_name") or discord_user["username"]
        )
        user.avatar_url = avatar_url
    else:
        user = User(
            username=discord_user["username"],
            display_name=discord_user.get("global_name")
            or discord_user["username"],
            discord_id=discord_id,
            avatar_url=avatar_url,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Create session (store Discord access token for guild list calls)
    session = Session(
        user_id=user.id,
        discord_access_token=token_data["access_token"],
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    use_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie(
        "session_id",
        session.id,
        httponly=True,
        secure=use_secure,
        samesite="lax",
        max_age=30 * 24 * 3600,
    )
    return response


@router.get("/me", response_model=AuthStatusResponse)
def me(request: Request, db: DBSession = Depends(get_db)):
    client_id = DISCORD_CLIENT_ID or None
    if is_dev_mode():
        user_id = request.headers.get("X-User-Id")
        if user_id:
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                return AuthStatusResponse(
                    authenticated=True,
                    user=UserResponse.model_validate(user),
                    dev_mode=True,
                    discord_client_id=client_id,
                )
        return AuthStatusResponse(authenticated=False, dev_mode=True, discord_client_id=client_id)

    # Check Bearer token first, then cookie
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        session_id = auth_header[7:]
    else:
        session_id = request.cookies.get("session_id")

    if not session_id:
        return AuthStatusResponse(authenticated=False, discord_client_id=client_id)

    session = (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not session:
        return AuthStatusResponse(authenticated=False, discord_client_id=client_id)

    user = db.query(User).filter(User.id == session.user_id).first()
    return AuthStatusResponse(
        authenticated=True,
        user=UserResponse.model_validate(user),
        discord_client_id=client_id,
    )


@router.post("/logout")
def logout(request: Request, db: DBSession = Depends(get_db)):
    session_id = request.cookies.get("session_id")
    if session_id:
        db.query(Session).filter(Session.id == session_id).delete()
        db.commit()
    response = RedirectResponse(url="/", status_code=302)
    response.delete_cookie("session_id")
    return response


# ── Mobile auth endpoints ─────────────────────────────────────────────


@router.get("/login/mobile")
def login_mobile():
    if is_dev_mode():
        raise HTTPException(404, "Auth disabled in dev mode")
    params = urlencode(
        {
            "client_id": DISCORD_CLIENT_ID,
            "redirect_uri": DISCORD_REDIRECT_URI_MOBILE,
            "response_type": "code",
            "scope": "identify guilds",
        }
    )
    return {"url": f"https://discord.com/oauth2/authorize?{params}"}


@router.get("/callback/mobile")
async def callback_mobile(code: str, db: DBSession = Depends(get_db)):
    if is_dev_mode():
        raise HTTPException(404, "Auth disabled in dev mode")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI_MOBILE,
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(400, "Failed to exchange code for token")
        token_data = token_resp.json()

        user_resp = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={
                "Authorization": f"Bearer {token_data['access_token']}"
            },
        )
        if user_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch Discord user")
        discord_user = user_resp.json()

    discord_id = str(discord_user["id"])
    user = db.query(User).filter(User.discord_id == discord_id).first()

    avatar_url = None
    if discord_user.get("avatar"):
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png"

    if user:
        user.display_name = (
            discord_user.get("global_name") or discord_user["username"]
        )
        user.avatar_url = avatar_url
    else:
        user = User(
            username=discord_user["username"],
            display_name=discord_user.get("global_name")
            or discord_user["username"],
            discord_id=discord_id,
            avatar_url=avatar_url,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    session = Session(
        user_id=user.id,
        discord_access_token=token_data["access_token"],
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
    }


class DevLoginRequest(BaseModel):
    user_id: int


@router.post("/dev-login")
def dev_login(body: DevLoginRequest, db: DBSession = Depends(get_db)):
    """Dev-only endpoint: create a session for a given user_id."""
    if not is_dev_mode():
        raise HTTPException(404, "Only available in dev mode")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    session = Session(
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
    }
