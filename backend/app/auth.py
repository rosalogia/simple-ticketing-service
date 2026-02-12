from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from .config import is_dev_mode
from .database import get_db
from .models import Session


def get_current_user_id(
    request: Request, db: DBSession = Depends(get_db)
) -> int:
    if is_dev_mode():
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            raise HTTPException(401, "X-User-Id header required in dev mode")
        return int(user_id)

    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, "Not authenticated")

    session = (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not session:
        raise HTTPException(401, "Session expired")

    return session.user_id


def get_optional_user_id(
    request: Request, db: DBSession = Depends(get_db)
) -> int | None:
    """Like get_current_user_id but returns None instead of 401 in dev mode
    when no user is selected. Used for endpoints that need to be accessible
    before a dev-mode user is chosen (e.g. user list for the switcher)."""
    if is_dev_mode():
        user_id = request.headers.get("X-User-Id")
        return int(user_id) if user_id else None

    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, "Not authenticated")

    session = (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not session:
        raise HTTPException(401, "Session expired")

    return session.user_id


def get_current_session(
    request: Request, db: DBSession = Depends(get_db)
) -> Session:
    if is_dev_mode():
        raise HTTPException(400, "Session not available in dev mode")

    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(401, "Not authenticated")

    session = (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not session:
        raise HTTPException(401, "Session expired")

    return session
