from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from .config import is_dev_mode
from .database import get_db
from .models import ApiKey, Session


def _validate_api_key(request: Request, db: DBSession) -> int | None:
    """Check for X-Api-Key header and return user_id if valid, None otherwise."""
    raw_key = request.headers.get("X-Api-Key")
    if not raw_key:
        return None

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
        .first()
    )
    if not api_key:
        return None

    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return api_key.user_id


def _get_session_id_from_request(request: Request) -> str | None:
    """Extract session ID from Authorization header (Bearer) or cookie."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return request.cookies.get("session_id")


def _validate_session(session_id: str, db: DBSession) -> Session | None:
    return (
        db.query(Session)
        .filter(
            Session.id == session_id,
            Session.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )


def get_current_user_id(
    request: Request, db: DBSession = Depends(get_db)
) -> int:
    # In dev mode, X-User-Id header takes priority (web frontend)
    if is_dev_mode():
        user_id = request.headers.get("X-User-Id")
        if user_id:
            return int(user_id)
        # Fall through to API key / Bearer token auth

    # API key auth (MCP server, CLI tools, etc.)
    api_key_user_id = _validate_api_key(request, db)
    if api_key_user_id is not None:
        return api_key_user_id

    session_id = _get_session_id_from_request(request)
    if not session_id:
        raise HTTPException(401, "Not authenticated")

    session = _validate_session(session_id, db)
    if not session:
        raise HTTPException(401, "Session expired")

    return session.user_id


def get_optional_user_id(
    request: Request, db: DBSession = Depends(get_db)
) -> int | None:
    """Like get_current_user_id but returns None instead of 401 in dev mode
    when no user is selected. Used for endpoints that need to be accessible
    before a dev-mode user is chosen (e.g. user list for the switcher)."""
    # In dev mode, X-User-Id header takes priority (web frontend)
    if is_dev_mode():
        user_id = request.headers.get("X-User-Id")
        if user_id:
            return int(user_id)
        # Fall through to API key / Bearer token auth

    # API key auth (MCP server, CLI tools, etc.)
    api_key_user_id = _validate_api_key(request, db)
    if api_key_user_id is not None:
        return api_key_user_id

    session_id = _get_session_id_from_request(request)
    if not session_id:
        if is_dev_mode():
            return None
        raise HTTPException(401, "Not authenticated")

    session = _validate_session(session_id, db)
    if not session:
        raise HTTPException(401, "Session expired")

    return session.user_id


def get_current_session(
    request: Request, db: DBSession = Depends(get_db)
) -> Session:
    if is_dev_mode():
        # Allow Bearer token sessions even in dev mode (mobile app)
        session_id = _get_session_id_from_request(request)
        if not session_id:
            raise HTTPException(400, "Session not available in dev mode")
        session = _validate_session(session_id, db)
        if not session:
            raise HTTPException(400, "Session not available in dev mode")
        return session

    session_id = _get_session_id_from_request(request)
    if not session_id:
        raise HTTPException(401, "Not authenticated")

    session = _validate_session(session_id, db)
    if not session:
        raise HTTPException(401, "Session expired")

    return session
