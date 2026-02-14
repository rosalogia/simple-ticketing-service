from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import DeviceToken
from ..schemas import DeviceTokenCreate

router = APIRouter()


@router.post("/token", status_code=201)
def register_device_token(
    payload: DeviceTokenCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    # Upsert: update if exists, create if not
    existing = (
        db.query(DeviceToken)
        .filter(
            DeviceToken.user_id == current_user_id,
            DeviceToken.token == payload.token,
        )
        .first()
    )
    if existing:
        existing.platform = payload.platform
        db.commit()
        return {"status": "updated"}

    device_token = DeviceToken(
        user_id=current_user_id,
        token=payload.token,
        platform=payload.platform,
    )
    db.add(device_token)
    db.commit()
    return {"status": "created"}


@router.delete("/token")
def unregister_device_token(
    payload: DeviceTokenCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    token = (
        db.query(DeviceToken)
        .filter(
            DeviceToken.user_id == current_user_id,
            DeviceToken.token == payload.token,
        )
        .first()
    )
    if not token:
        raise HTTPException(404, "Token not found")
    db.delete(token)
    db.commit()
    return {"status": "deleted"}
