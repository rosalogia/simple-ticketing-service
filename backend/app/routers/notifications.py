from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import Notification
from ..schemas import NotificationResponse

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    query = db.query(Notification).filter(
        Notification.user_id == current_user_id,
        Notification.created_at > cutoff,
    )
    if unread_only:
        query = query.filter(Notification.read == False)  # noqa: E712
    return query.order_by(Notification.created_at.desc()).limit(50).all()


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    if notif.user_id != current_user_id:
        raise HTTPException(403, "Not your notification")
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    db.query(Notification).filter(
        Notification.user_id == current_user_id,
        Notification.read == False,  # noqa: E712
    ).update({"read": True})
    db.commit()


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    if notif.user_id != current_user_id:
        raise HTTPException(403, "Not your notification")
    db.delete(notif)
    db.commit()
