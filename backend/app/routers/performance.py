from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_user_id
from ..database import get_db
from ..models import (
    EscalationTracking,
    QueueMember,
    Ticket,
    TicketEvent,
    TicketEventType,
    TicketStatus,
    User,
)
from ..schemas import (
    UserPerformanceMetrics,
    UserResponse,
    WeeklySeverityData,
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


@router.get("/{queue_id}/performance/{user_id}", response_model=UserPerformanceMetrics)
def get_user_performance(
    queue_id: int,
    user_id: int,
    weeks: int = Query(12, ge=1, le=52),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_queue_membership(db, queue_id, current_user_id)

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")

    now = datetime.now(timezone.utc)

    # Base: tickets in this queue assigned to user_id
    base = db.query(Ticket).filter(
        Ticket.queue_id == queue_id,
        Ticket.assignee_id == user_id,
    )

    # ── Unclosed tickets ──
    unclosed = base.filter(
        Ticket.status.notin_([TicketStatus.COMPLETED, TicketStatus.CANCELLED])
    )
    unclosed_count = unclosed.count()

    oldest_created = unclosed.with_entities(func.min(Ticket.created_at)).scalar()
    if oldest_created is not None:
        if oldest_created.tzinfo is None:
            oldest_created = oldest_created.replace(tzinfo=timezone.utc)
        oldest_age_days = (now - oldest_created).days
    else:
        oldest_age_days = None

    # ── Completed tickets ──
    completed_tickets = base.filter(Ticket.status == TicketStatus.COMPLETED).all()
    total_completed = len(completed_tickets)

    # ── Resolution vs escalation ──
    resolved_before_escalation = 0
    resolved_after_escalation = 0
    for t in completed_tickets:
        et = (
            db.query(EscalationTracking)
            .filter(EscalationTracking.ticket_id == t.id)
            .first()
        )
        if et and et.escalation_count > 0:
            resolved_after_escalation += 1
        else:
            resolved_before_escalation += 1

    # ── Resolution vs due date ──
    resolved_before_due = 0
    resolved_after_due = 0
    resolved_no_due = 0
    for t in completed_tickets:
        if t.due_date is None:
            resolved_no_due += 1
            continue
        # Find the STATUS_CHANGED → COMPLETED event
        close_event = (
            db.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == t.id,
                TicketEvent.event_type == TicketEventType.STATUS_CHANGED,
                TicketEvent.new_value == TicketStatus.COMPLETED.value,
            )
            .order_by(TicketEvent.created_at.desc())
            .first()
        )
        if close_event:
            close_dt = close_event.created_at
            if close_dt.tzinfo is None:
                close_dt = close_dt.replace(tzinfo=timezone.utc)
            due_dt = datetime(t.due_date.year, t.due_date.month, t.due_date.day, tzinfo=timezone.utc)
            if close_dt < due_dt:
                resolved_before_due += 1
            else:
                resolved_after_due += 1
        else:
            # No event found — fall back to updated_at
            updated = t.updated_at
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
            due_dt = datetime(t.due_date.year, t.due_date.month, t.due_date.day, tzinfo=timezone.utc)
            if updated < due_dt:
                resolved_before_due += 1
            else:
                resolved_after_due += 1

    # ── Avg time to close (hours) ──
    close_times = []
    for t in completed_tickets:
        close_event = (
            db.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == t.id,
                TicketEvent.event_type == TicketEventType.STATUS_CHANGED,
                TicketEvent.new_value == TicketStatus.COMPLETED.value,
            )
            .order_by(TicketEvent.created_at.desc())
            .first()
        )
        if close_event:
            close_dt = close_event.created_at
            created_dt = t.created_at
            if close_dt.tzinfo is None:
                close_dt = close_dt.replace(tzinfo=timezone.utc)
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            hours = (close_dt - created_dt).total_seconds() / 3600
            close_times.append(hours)

    avg_close = round(sum(close_times) / len(close_times), 1) if close_times else None

    # ── Avg time to start (OPEN → IN_PROGRESS, hours) ──
    all_tickets = base.all()
    start_times = []
    for t in all_tickets:
        start_event = (
            db.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == t.id,
                TicketEvent.event_type == TicketEventType.STATUS_CHANGED,
                TicketEvent.new_value == TicketStatus.IN_PROGRESS.value,
            )
            .order_by(TicketEvent.created_at.asc())
            .first()
        )
        if start_event:
            start_dt = start_event.created_at
            created_dt = t.created_at
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            hours = (start_dt - created_dt).total_seconds() / 3600
            start_times.append(hours)

    avg_start = round(sum(start_times) / len(start_times), 1) if start_times else None

    # ── Tickets per week by severity ──
    weeks_ago = now - timedelta(weeks=weeks)
    weekly_tickets = (
        base.filter(Ticket.created_at >= weeks_ago).all()
    )

    week_buckets: dict[date, dict[str, int]] = {}
    for t in weekly_tickets:
        created = t.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        # Monday of the week
        week_start = (created.date() - timedelta(days=created.weekday()))
        if week_start not in week_buckets:
            week_buckets[week_start] = {"sev1": 0, "sev2": 0, "sev3": 0, "sev4": 0}
        key = t.priority.value.lower()
        week_buckets[week_start][key] += 1

    weekly_data = sorted(
        [WeeklySeverityData(week_start=ws, **counts) for ws, counts in week_buckets.items()],
        key=lambda d: d.week_start,
    )

    return UserPerformanceMetrics(
        user=UserResponse.model_validate(target_user, from_attributes=True),
        unclosed_ticket_count=unclosed_count,
        oldest_unclosed_ticket_age_days=oldest_age_days,
        resolved_before_escalation_count=resolved_before_escalation,
        resolved_after_escalation_count=resolved_after_escalation,
        resolved_before_due_count=resolved_before_due,
        resolved_after_due_count=resolved_after_due,
        resolved_no_due_date_count=resolved_no_due,
        total_completed=total_completed,
        avg_time_to_close_hours=avg_close,
        avg_time_to_start_hours=avg_start,
        tickets_per_week_by_severity=weekly_data,
    )
