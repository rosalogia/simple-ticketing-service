from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import case, func
from sqlalchemy.orm import Session, selectinload

from ..ratelimit import limiter

from ..auth import get_current_user_id
from ..database import get_db
from ..models import (
    Comment,
    Queue,
    QueueMember,
    QueueRole,
    SEVERITY_NUM,
    Ticket,
    TicketPriority,
    TicketStatus,
)
from ..schemas import (
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketStats,
    TicketUpdate,
)

router = APIRouter()


def _require_queue_membership(db: Session, queue_id: int, user_id: int) -> QueueMember:
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")
    return member


def _require_ticket_access(db: Session, ticket: Ticket, user_id: int) -> QueueMember:
    return _require_queue_membership(db, ticket.queue_id, user_id)


def _ticket_to_response(ticket: Ticket, comment_count: int | None = None) -> TicketResponse:
    count = comment_count if comment_count is not None else len(ticket.comments)
    return TicketResponse.model_validate(
        ticket, from_attributes=True
    ).model_copy(update={"comment_count": count})


# ── Stats (must be before /{id}) ──────────────────────────────────────


@router.get("/stats", response_model=TicketStats)
def get_ticket_stats(
    queue_id: int,
    assignee_id: int | None = None,
    assigner_id: int | None = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_queue_membership(db, queue_id, current_user_id)

    q = db.query(Ticket).filter(Ticket.queue_id == queue_id)
    if assignee_id is not None:
        q = q.filter(Ticket.assignee_id == assignee_id)
    if assigner_id is not None:
        q = q.filter(Ticket.assigner_id == assigner_id)

    tickets = q.all()
    today = date.today()
    return TicketStats(
        open_count=sum(1 for t in tickets if t.status == TicketStatus.OPEN),
        in_progress_count=sum(
            1 for t in tickets if t.status == TicketStatus.IN_PROGRESS
        ),
        blocked_count=sum(1 for t in tickets if t.status == TicketStatus.BLOCKED),
        completed_count=sum(
            1 for t in tickets if t.status == TicketStatus.COMPLETED
        ),
        overdue_count=sum(
            1
            for t in tickets
            if t.due_date is not None
            and t.due_date < today
            and t.status not in (TicketStatus.COMPLETED, TicketStatus.CANCELLED)
        ),
        total=len(tickets),
    )


# ── CRUD ──────────────────────────────────────────────────────────────


@router.get("/", response_model=TicketListResponse)
def list_tickets(
    queue_id: int,
    status: list[TicketStatus] | None = Query(None),
    priority: list[TicketPriority] | None = Query(None),
    assignee_id: int | None = None,
    assigner_id: int | None = None,
    search: str | None = None,
    due_before: date | None = None,
    due_after: date | None = None,
    category: str | None = None,
    ticket_type: str | None = Query(None, alias="type"),
    item: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_queue_membership(db, queue_id, current_user_id)
    limit = min(limit, 100)

    # Build filter conditions
    conditions = [Ticket.queue_id == queue_id]
    if status:
        conditions.append(Ticket.status.in_(status))
    if priority:
        conditions.append(Ticket.priority.in_(priority))
    if assignee_id is not None:
        conditions.append(Ticket.assignee_id == assignee_id)
    if assigner_id is not None:
        conditions.append(Ticket.assigner_id == assigner_id)
    if search:
        pattern = f"%{search}%"
        conditions.append(
            Ticket.title.ilike(pattern) | Ticket.description.ilike(pattern)
        )
    if due_before:
        conditions.append(Ticket.due_date <= due_before)
    if due_after:
        conditions.append(Ticket.due_date >= due_after)
    if category:
        conditions.append(Ticket.category == category)
    if ticket_type:
        conditions.append(Ticket.type == ticket_type)
    if item:
        conditions.append(Ticket.item == item)

    total = db.query(func.count(Ticket.id)).filter(*conditions).scalar()

    # Comment count subquery (avoids loading all comment objects)
    comment_count_sq = (
        db.query(
            Comment.ticket_id,
            func.count(Comment.id).label("comment_count"),
        )
        .group_by(Comment.ticket_id)
        .subquery()
    )

    q = (
        db.query(Ticket, func.coalesce(comment_count_sq.c.comment_count, 0))
        .outerjoin(comment_count_sq, comment_count_sq.c.ticket_id == Ticket.id)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
        )
        .filter(*conditions)
    )

    # Sorting
    sort_column_map = {
        "created_at": Ticket.created_at,
        "updated_at": Ticket.updated_at,
        "due_date": Ticket.due_date,
        "title": Ticket.title,
        "priority": case(
            (Ticket.priority == TicketPriority.SEV1, 1),
            (Ticket.priority == TicketPriority.SEV2, 2),
            (Ticket.priority == TicketPriority.SEV3, 3),
            (Ticket.priority == TicketPriority.SEV4, 4),
        ),
    }
    sort_col = sort_column_map.get(sort_by, Ticket.created_at)
    if sort_order == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    rows = q.offset(skip).limit(limit).all()
    return TicketListResponse(
        tickets=[_ticket_to_response(ticket, cc) for ticket, cc in rows],
        total=total,
    )


@router.post("/", response_model=TicketResponse, status_code=201)
@limiter.limit("30/minute")
def create_ticket(
    request: Request,
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    member = _require_queue_membership(db, payload.queue_id, current_user_id)
    queue = db.query(Queue).filter(Queue.id == payload.queue_id).first()
    if not queue:
        raise HTTPException(404, "Queue not found")

    # Severity check for MEMBER role
    if member.role == QueueRole.MEMBER:
        max_sev_num = SEVERITY_NUM[queue.member_max_severity]
        ticket_sev_num = SEVERITY_NUM[payload.priority]
        if ticket_sev_num < max_sev_num:
            raise HTTPException(
                403,
                f"Members can only create tickets with severity {queue.member_max_severity.value} or lower",
            )

    # VIEWER cannot create tickets
    if member.role == QueueRole.VIEWER:
        raise HTTPException(403, "Viewers cannot create tickets")

    # Verify assignee is a queue member
    assignee_member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == payload.queue_id, QueueMember.user_id == payload.assignee_id)
        .first()
    )
    if not assignee_member:
        raise HTTPException(400, "Assignee must be a member of this queue")

    ticket = Ticket(**payload.model_dump(), assigner_id=current_user_id)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.comments),
        )
        .filter(Ticket.id == ticket.id)
        .first()
    )
    return _ticket_to_response(ticket)


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.comments).selectinload(Comment.user),
        )
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)
    return _ticket_to_response(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    update_data = payload.model_dump(exclude_unset=True)

    # If changing assignee, verify new assignee is queue member
    if "assignee_id" in update_data:
        assignee_member = (
            db.query(QueueMember)
            .filter(
                QueueMember.queue_id == ticket.queue_id,
                QueueMember.user_id == update_data["assignee_id"],
            )
            .first()
        )
        if not assignee_member:
            raise HTTPException(400, "Assignee must be a member of this queue")

    for key, value in update_data.items():
        setattr(ticket, key, value)

    db.commit()
    db.refresh(ticket)

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.comments),
        )
        .filter(Ticket.id == ticket.id)
        .first()
    )
    return _ticket_to_response(ticket)


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    db.delete(ticket)
    db.commit()
