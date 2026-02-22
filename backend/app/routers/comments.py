from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from ..ratelimit import limiter

from ..auth import get_current_user_id
from ..database import get_db
from ..models import Comment, QueueMember, Ticket, User

from ..notifications import notify_comment_added
from ..schemas import CommentCreate, CommentResponse, CommentUpdate

router = APIRouter()


def _require_ticket_queue_access(db: Session, ticket_id: int, user_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == ticket.queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")
    return ticket


@router.get("/{ticket_id}/comments", response_model=list[CommentResponse])
def list_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_ticket_queue_access(db, ticket_id, current_user_id)

    comments = (
        db.query(Comment)
        .options(selectinload(Comment.user), selectinload(Comment.on_behalf_of))
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return comments


@router.post(
    "/{ticket_id}/comments", response_model=CommentResponse, status_code=201
)
@limiter.limit("60/minute")
def create_comment(
    request: Request,
    ticket_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_ticket_queue_access(db, ticket_id, current_user_id)

    if not db.query(User).filter(User.id == current_user_id).first():
        raise HTTPException(404, "User not found")

    # Allow API key users to attribute comment to another user
    user_id = current_user_id
    on_behalf_of_id = None
    if payload.on_behalf_of is not None and getattr(request.state, "api_key_auth", False):
        obo_user = db.query(User).filter(User.id == payload.on_behalf_of).first()
        if not obo_user:
            raise HTTPException(400, "on_behalf_of user not found")
        bot_user_id = getattr(request.state, "api_key_bot_user_id", None)
        if bot_user_id:
            user_id = bot_user_id
            on_behalf_of_id = payload.on_behalf_of
        else:
            user_id = current_user_id
            on_behalf_of_id = payload.on_behalf_of

    comment = Comment(
        ticket_id=ticket_id, user_id=user_id, content=payload.content, on_behalf_of_id=on_behalf_of_id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Notify assigner and assignee about new comment
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket:
        notify_comment_added(db, ticket, current_user_id, payload.content)

    comment = (
        db.query(Comment)
        .options(selectinload(Comment.user), selectinload(Comment.on_behalf_of))
        .filter(Comment.id == comment.id)
        .first()
    )
    return comment


@router.patch(
    "/{ticket_id}/comments/{comment_id}", response_model=CommentResponse
)
def update_comment(
    ticket_id: int,
    comment_id: int,
    payload: CommentUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_ticket_queue_access(db, ticket_id, current_user_id)

    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.ticket_id == ticket_id)
        .first()
    )
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != current_user_id:
        raise HTTPException(403, "Can only edit your own comments")

    from datetime import datetime, timezone

    comment.content = payload.content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)

    comment = (
        db.query(Comment)
        .options(selectinload(Comment.user), selectinload(Comment.on_behalf_of))
        .filter(Comment.id == comment.id)
        .first()
    )
    return comment


@router.delete("/{ticket_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    ticket_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_ticket_queue_access(db, ticket_id, current_user_id)

    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.ticket_id == ticket_id)
        .first()
    )
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != current_user_id:
        raise HTTPException(403, "Can only delete your own comments")

    db.delete(comment)
    db.commit()
