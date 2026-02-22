from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import ApiKey, User
from ..schemas import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse

router = APIRouter()


def _generate_api_key() -> str:
    """Generate a raw API key: sts_ + 32 bytes url-safe base64."""
    return "sts_" + secrets.token_urlsafe(32)


@router.post("/", response_model=ApiKeyCreateResponse, status_code=201)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    raw_key = _generate_api_key()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    api_key = ApiKey(
        key_hash=key_hash,
        key_prefix=raw_key[:8],
        name=payload.name,
        user_id=current_user_id,
    )
    db.add(api_key)
    db.flush()  # Get api_key.id for bot username

    # Auto-create a bot user linked to this API key
    bot_user = User(
        username=f"bot-{api_key.id}",
        display_name=payload.name,
        is_bot=True,
    )
    db.add(bot_user)
    db.flush()
    api_key.bot_user_id = bot_user.id
    db.commit()
    db.refresh(api_key)

    return ApiKeyCreateResponse(
        id=api_key.id,
        key_prefix=api_key.key_prefix,
        name=api_key.name,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        revoked_at=api_key.revoked_at,
        key=raw_key,
    )


@router.get("/", response_model=list[ApiKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == current_user_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return keys


@router.delete("/{key_id}", status_code=204)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    api_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not api_key:
        raise HTTPException(404, "API key not found")
    if api_key.user_id != current_user_id:
        raise HTTPException(403, "Can only revoke your own API keys")
    if api_key.revoked_at is not None:
        raise HTTPException(400, "API key is already revoked")

    api_key.revoked_at = datetime.now(timezone.utc)
    db.commit()
