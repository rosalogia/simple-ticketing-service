from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import DEFAULT_SCHEDULE, QueueMember, UserQueueSettings
from ..schemas import UserQueueSettingsResponse, UserQueueSettingsUpdate

router = APIRouter()


@router.get("/{queue_id}/my-settings", response_model=UserQueueSettingsResponse)
def get_my_queue_settings(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    # Verify membership
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == current_user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")

    settings = (
        db.query(UserQueueSettings)
        .filter(
            UserQueueSettings.user_id == current_user_id,
            UserQueueSettings.queue_id == queue_id,
        )
        .first()
    )
    if not settings:
        # Return defaults
        settings = UserQueueSettings(
            user_id=current_user_id,
            queue_id=queue_id,
            schedule=DEFAULT_SCHEDULE,
            timezone="America/New_York",
            sev1_off_hours_opt_out=False,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/{queue_id}/my-settings", response_model=UserQueueSettingsResponse)
def update_my_queue_settings(
    queue_id: int,
    payload: UserQueueSettingsUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    # Verify membership
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == current_user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")

    settings = (
        db.query(UserQueueSettings)
        .filter(
            UserQueueSettings.user_id == current_user_id,
            UserQueueSettings.queue_id == queue_id,
        )
        .first()
    )
    if not settings:
        settings = UserQueueSettings(
            user_id=current_user_id,
            queue_id=queue_id,
        )
        db.add(settings)
        db.flush()

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
