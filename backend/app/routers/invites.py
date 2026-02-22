from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user_id
from ..database import get_db
from ..models import Queue, QueueInvite, QueueMember, QueueRole, User
from ..notifications import notify_queue_invite
from ..schemas import InviteMemberRequest, QueueInviteResponse, QueueResponse

router = APIRouter()


def _require_owner(db: Session, queue_id: int, user_id: int) -> QueueMember:
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member or member.role != QueueRole.OWNER:
        raise HTTPException(403, "Owner access required")
    return member


def _invite_to_response(invite: QueueInvite, queue: Queue) -> QueueInviteResponse:
    return QueueInviteResponse(
        id=invite.id,
        queue=QueueResponse(
            id=queue.id,
            name=queue.name,
            description=queue.description,
            icon_url=queue.icon_url,
            discord_guild_id=queue.discord_guild_id,
            member_max_severity=queue.member_max_severity,
            member_count=len(queue.members) if queue.members else 0,
            my_role=None,
            created_at=queue.created_at,
        ),
        role=invite.role,
        invited_by=invite.inviter,
        created_at=invite.created_at,
    )


@router.post("/queues/{queue_id}/invites", response_model=QueueInviteResponse, status_code=201)
def invite_member(
    queue_id: int,
    payload: InviteMemberRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_owner(db, queue_id, current_user_id)

    target_user = db.query(User).filter(User.username == payload.username).first()
    if not target_user:
        raise HTTPException(404, "User not found")

    # Check already a member
    existing_member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == target_user.id)
        .first()
    )
    if existing_member:
        raise HTTPException(409, "User is already a member")

    # Check already invited
    existing_invite = (
        db.query(QueueInvite)
        .filter(QueueInvite.queue_id == queue_id, QueueInvite.user_id == target_user.id)
        .first()
    )
    if existing_invite:
        raise HTTPException(409, "User has already been invited")

    invite = QueueInvite(
        queue_id=queue_id,
        user_id=target_user.id,
        role=payload.role,
        invited_by=current_user_id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    invite = (
        db.query(QueueInvite)
        .options(
            selectinload(QueueInvite.inviter),
            selectinload(QueueInvite.queue).selectinload(Queue.members),
        )
        .filter(QueueInvite.id == invite.id)
        .first()
    )

    notify_queue_invite(db, invite)

    return _invite_to_response(invite, invite.queue)


@router.get("/invites", response_model=list[QueueInviteResponse])
def list_my_invites(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    invites = (
        db.query(QueueInvite)
        .options(
            selectinload(QueueInvite.inviter),
            selectinload(QueueInvite.queue).selectinload(Queue.members),
        )
        .filter(QueueInvite.user_id == current_user_id)
        .order_by(QueueInvite.created_at.desc())
        .all()
    )
    return [_invite_to_response(inv, inv.queue) for inv in invites]


@router.post("/invites/{invite_id}/accept", response_model=QueueInviteResponse)
def accept_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    invite = (
        db.query(QueueInvite)
        .options(
            selectinload(QueueInvite.inviter),
            selectinload(QueueInvite.queue).selectinload(Queue.members),
        )
        .filter(QueueInvite.id == invite_id)
        .first()
    )
    if not invite:
        raise HTTPException(404, "Invite not found")
    if invite.user_id != current_user_id:
        raise HTTPException(403, "Not your invite")

    response = _invite_to_response(invite, invite.queue)

    member = QueueMember(
        queue_id=invite.queue_id,
        user_id=invite.user_id,
        role=invite.role,
    )
    db.add(member)
    db.delete(invite)
    db.commit()

    return response


@router.post("/invites/{invite_id}/decline", status_code=204)
def decline_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    invite = (
        db.query(QueueInvite)
        .filter(QueueInvite.id == invite_id)
        .first()
    )
    if not invite:
        raise HTTPException(404, "Invite not found")
    if invite.user_id != current_user_id:
        raise HTTPException(403, "Not your invite")

    db.delete(invite)
    db.commit()
