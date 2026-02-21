from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import case, func
from sqlalchemy.orm import Session, selectinload

from ..ratelimit import limiter

from ..auth import get_current_user_id
from ..database import get_db
from ..models import (
    Comment,
    EscalationTracking,
    PageTracking,
    Queue,
    QueueMember,
    QueueRole,
    SEVERITY_NUM,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
)
from ..notifications import (
    notify_status_changed,
    notify_ticket_assigned,
    notify_ticket_reassigned,
    trigger_page_for_ticket,
)
from ..scheduler import ESCALATION_LADDER, PAGING_INTERVALS
from ..schemas import (
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketStats,
    TicketUpdate,
)

logger = logging.getLogger(__name__)

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


def _ticket_to_response(
    ticket: Ticket,
    comment_count: int | None = None,
    **extra: object,
) -> TicketResponse:
    count = comment_count if comment_count is not None else len(ticket.comments)
    updates: dict[str, object] = {"comment_count": count}
    updates.update(extra)
    return TicketResponse.model_validate(
        ticket, from_attributes=True
    ).model_copy(update=updates)


def _compute_next_escalation_at(
    db: Session, ticket: Ticket
) -> tuple[datetime | None, bool]:
    """Return (next_escalation_at, paused) for a ticket."""
    # Terminal / blocked → paused
    if ticket.status in (TicketStatus.BLOCKED, TicketStatus.COMPLETED, TicketStatus.CANCELLED):
        return None, True

    if not ticket.due_date:
        return None, False

    tracking = (
        db.query(EscalationTracking)
        .filter(EscalationTracking.ticket_id == ticket.id)
        .first()
    )
    if tracking and tracking.paused:
        return None, True

    # Use tracking values if available, otherwise assume fresh state
    escalation_count = tracking.escalation_count if tracking else 0
    last_escalation_at = tracking.last_escalation_at if tracking else None
    # Already at ceiling
    if ticket.priority == TicketPriority.SEV1:
        return None, False

    now = datetime.now(timezone.utc)
    today = now.date()
    due = ticket.due_date

    if today > due:
        # After due date: escalate once per day
        if last_escalation_at is None:
            return now, False
        last = last_escalation_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return last + timedelta(days=1), False
    elif today == due:
        # On due date: escalate once
        if last_escalation_at is None or last_escalation_at.date() < due:
            return now, False
        # Already escalated today → next is tomorrow
        last = last_escalation_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        return last + timedelta(days=1), False
    else:
        # Before due date
        days_until_due = (due - today).days
        if days_until_due <= 7:
            # Skip if ticket was created less than 1 week from due
            created_date = ticket.created_at.date() if ticket.created_at else today
            if (due - created_date).days < 7:
                return None, False
            # Escalate once at the 1-week mark
            if escalation_count == 0:
                return now, False
            # Already escalated at 1-week mark → next on due date
            return datetime(due.year, due.month, due.day, tzinfo=timezone.utc), False
        else:
            # >7 days out → next at due_date - 7 days
            target = due - timedelta(days=7)
            return datetime(target.year, target.month, target.day, tzinfo=timezone.utc), False


def _compute_next_page_at(
    db: Session, ticket: Ticket
) -> tuple[datetime | None, bool]:
    """Return (next_page_at, acknowledged) for a ticket."""
    if ticket.priority not in (TicketPriority.SEV1, TicketPriority.SEV2):
        return None, False
    if ticket.status not in (TicketStatus.OPEN, TicketStatus.IN_PROGRESS):
        return None, False

    interval_minutes = PAGING_INTERVALS.get((ticket.priority, ticket.status))
    if interval_minutes is None:
        return None, False

    tracking = (
        db.query(PageTracking)
        .filter(PageTracking.ticket_id == ticket.id)
        .first()
    )
    if not tracking:
        return None, False

    acknowledged = tracking.acknowledged_at is not None

    if tracking.last_page_sent_at is not None:
        last_sent = tracking.last_page_sent_at
        if last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
        return last_sent + timedelta(minutes=interval_minutes), acknowledged

    return None, acknowledged


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
            selectinload(Ticket.on_behalf_of),
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

    # Allow API key users to attribute ticket creation to another user
    assigner_id = current_user_id
    on_behalf_of_id = None
    if payload.on_behalf_of is not None and getattr(request.state, "api_key_auth", False):
        bot_user = db.query(User).filter(User.id == payload.on_behalf_of).first()
        if not bot_user:
            raise HTTPException(400, "on_behalf_of user not found")
        assigner_id = payload.on_behalf_of
        on_behalf_of_id = current_user_id  # The API key holder

    ticket = Ticket(**payload.model_dump(exclude={"on_behalf_of"}), assigner_id=assigner_id, on_behalf_of_id=on_behalf_of_id)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Create page tracking for SEV1/SEV2
    if ticket.priority in (TicketPriority.SEV1, TicketPriority.SEV2):
        now = datetime.now(timezone.utc)
        pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
        db.add(pt)
        db.commit()
        trigger_page_for_ticket(db, ticket)

    # Create escalation tracking when due_date is set
    if ticket.due_date:
        et = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=ticket.priority,
            escalation_count=0,
            paused=False,
        )
        db.add(et)
        db.commit()

    # Send notification to assignee
    notify_ticket_assigned(db, ticket)

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.on_behalf_of),
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
            selectinload(Ticket.on_behalf_of),
            selectinload(Ticket.comments).selectinload(Comment.user),
            selectinload(Ticket.comments).selectinload(Comment.on_behalf_of),
        )
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    next_esc, esc_paused = _compute_next_escalation_at(db, ticket)
    next_pg, pg_acked = _compute_next_page_at(db, ticket)

    return _ticket_to_response(
        ticket,
        next_escalation_at=next_esc,
        next_page_at=next_pg,
        escalation_paused=esc_paused,
        page_acknowledged=pg_acked,
    )


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

    # Capture old values for notification logic
    old_assignee_id = ticket.assignee_id
    old_status = ticket.status
    old_priority = ticket.priority

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

    now = datetime.now(timezone.utc)

    # Handle assignee change notifications + paging
    if "assignee_id" in update_data and update_data["assignee_id"] != old_assignee_id:
        notify_ticket_reassigned(db, ticket, old_assignee_id, update_data["assignee_id"])
        # Reset page tracking for new assignee on SEV1/SEV2
        if ticket.priority in (TicketPriority.SEV1, TicketPriority.SEV2):
            pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
            if pt:
                pt.last_page_sent_at = now
                pt.acknowledged_at = None
                pt.acknowledged_by = None
            else:
                pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
                db.add(pt)
            db.commit()
            trigger_page_for_ticket(db, ticket)

    # Handle status change notifications
    if "status" in update_data and ticket.status != old_status:
        notify_status_changed(db, ticket, current_user_id)

        # Toggle escalation paused state
        et = db.query(EscalationTracking).filter(EscalationTracking.ticket_id == ticket.id).first()
        if et:
            if ticket.status in (TicketStatus.BLOCKED, TicketStatus.COMPLETED, TicketStatus.CANCELLED):
                et.paused = True
            else:
                et.paused = False
            db.commit()

    # Handle due_date change — ensure escalation tracking exists
    if "due_date" in update_data and ticket.due_date:
        et = db.query(EscalationTracking).filter(EscalationTracking.ticket_id == ticket.id).first()
        if not et:
            et = EscalationTracking(
                ticket_id=ticket.id,
                original_priority=ticket.priority,
                escalation_count=0,
                paused=ticket.status in (TicketStatus.BLOCKED, TicketStatus.COMPLETED, TicketStatus.CANCELLED),
            )
            db.add(et)
            db.commit()

    # Handle priority change — create/remove page tracking as needed
    if "priority" in update_data and ticket.priority != old_priority:
        if ticket.priority in (TicketPriority.SEV1, TicketPriority.SEV2):
            pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
            if not pt:
                pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
                db.add(pt)
                db.commit()
            if ticket.status in (TicketStatus.OPEN, TicketStatus.IN_PROGRESS):
                trigger_page_for_ticket(db, ticket)

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.on_behalf_of),
            selectinload(Ticket.comments),
        )
        .filter(Ticket.id == ticket.id)
        .first()
    )
    return _ticket_to_response(ticket)


@router.post("/{ticket_id}/acknowledge")
def acknowledge_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
    if not pt:
        raise HTTPException(404, "No page tracking for this ticket")

    pt.acknowledged_at = datetime.now(timezone.utc)
    pt.acknowledged_by = current_user_id
    db.commit()
    return {"status": "acknowledged"}


@router.post("/{ticket_id}/escalate")
def escalate_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    if ticket.priority == TicketPriority.SEV1:
        raise HTTPException(400, "Ticket is already SEV1 — cannot escalate further")

    now = datetime.now(timezone.utc)

    # Get or create escalation tracking
    et = db.query(EscalationTracking).filter(EscalationTracking.ticket_id == ticket.id).first()
    if not et:
        et = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=ticket.priority,
            escalation_count=0,
            paused=False,
        )
        db.add(et)
        db.flush()

    # Bump priority
    new_priority = ESCALATION_LADDER[ticket.priority]
    ticket.priority = new_priority
    et.last_escalation_at = now
    et.escalation_count += 1
    db.commit()

    # If now SEV1/SEV2, create page tracking and trigger page
    if new_priority in (TicketPriority.SEV1, TicketPriority.SEV2):
        pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
        if not pt:
            pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
            db.add(pt)
            db.commit()
        if ticket.status in (TicketStatus.OPEN, TicketStatus.IN_PROGRESS):
            trigger_page_for_ticket(db, ticket)

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.on_behalf_of),
            selectinload(Ticket.comments),
        )
        .filter(Ticket.id == ticket.id)
        .first()
    )
    return _ticket_to_response(ticket)


@router.post("/{ticket_id}/page")
def page_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    _require_ticket_access(db, ticket, current_user_id)

    if ticket.priority not in (TicketPriority.SEV1, TicketPriority.SEV2):
        raise HTTPException(400, "Paging is only available for SEV1/SEV2 tickets")

    if ticket.status not in (TicketStatus.OPEN, TicketStatus.IN_PROGRESS):
        raise HTTPException(400, "Paging is only available for OPEN or IN_PROGRESS tickets")

    now = datetime.now(timezone.utc)

    trigger_page_for_ticket(db, ticket)

    pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
    if pt:
        pt.last_page_sent_at = now
        pt.acknowledged_at = None
    else:
        pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
        db.add(pt)
    db.commit()

    ticket = (
        db.query(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.assigner),
            selectinload(Ticket.on_behalf_of),
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
