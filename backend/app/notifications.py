from __future__ import annotations

import logging
from datetime import datetime, time

from sqlalchemy.orm import Session

from .fcm import send_notification, send_page
from .models import (
    DeviceToken,
    Ticket,
    TicketPriority,
    UserQueueSettings,
)

logger = logging.getLogger(__name__)


def _get_user_device_tokens(db: Session, user_id: int) -> list[str]:
    tokens = db.query(DeviceToken.token).filter(DeviceToken.user_id == user_id).all()
    return [t[0] for t in tokens]


def _send_to_user(db: Session, user_id: int, title: str, body: str, data: dict[str, str] | None = None) -> None:
    tokens = _get_user_device_tokens(db, user_id)
    for token in tokens:
        send_notification(token, title, body, data)


def notify_ticket_assigned(db: Session, ticket: Ticket) -> None:
    """Notify assignee when they are assigned a ticket."""
    if ticket.assignee_id == ticket.assigner_id:
        return
    data = {"type": "ticket_assigned", "ticket_id": str(ticket.id)}
    _send_to_user(
        db, ticket.assignee_id,
        "New Ticket Assigned",
        f"You've been assigned: {ticket.title}",
        data,
    )


def notify_ticket_reassigned(
    db: Session, ticket: Ticket, old_assignee_id: int, new_assignee_id: int
) -> None:
    """Notify old and new assignee on reassignment."""
    data = {"type": "ticket_reassigned", "ticket_id": str(ticket.id)}
    if old_assignee_id != new_assignee_id:
        _send_to_user(
            db, old_assignee_id,
            "Ticket Unassigned",
            f"You've been unassigned from: {ticket.title}",
            data,
        )
        _send_to_user(
            db, new_assignee_id,
            "Ticket Assigned",
            f"You've been assigned: {ticket.title}",
            data,
        )


def notify_status_changed(db: Session, ticket: Ticket, changed_by_id: int) -> None:
    """Notify assigner when assignee changes ticket status."""
    if changed_by_id == ticket.assigner_id:
        return
    data = {"type": "status_changed", "ticket_id": str(ticket.id)}
    _send_to_user(
        db, ticket.assigner_id,
        "Ticket Status Updated",
        f"{ticket.title} is now {ticket.status.value}",
        data,
    )


def notify_comment_added(db: Session, ticket: Ticket, commenter_id: int) -> None:
    """Notify assigner and assignee on comments (excluding own)."""
    data = {"type": "comment_added", "ticket_id": str(ticket.id)}
    recipients = {ticket.assigner_id, ticket.assignee_id} - {commenter_id}
    for user_id in recipients:
        _send_to_user(
            db, user_id,
            "New Comment",
            f"New comment on: {ticket.title}",
            data,
        )


def _is_within_pageable_hours(
    db: Session, user_id: int, queue_id: int
) -> bool:
    """Check if current time is within the user's pageable hours for this queue."""
    settings = (
        db.query(UserQueueSettings)
        .filter(
            UserQueueSettings.user_id == user_id,
            UserQueueSettings.queue_id == queue_id,
        )
        .first()
    )
    if not settings:
        # Default: 09:00-17:00 America/New_York
        start_str, end_str, tz_name = "09:00", "17:00", "America/New_York"
    else:
        start_str = settings.pageable_start
        end_str = settings.pageable_end
        tz_name = settings.timezone

    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(tz_name)
    except Exception:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo("America/New_York")

    now = datetime.now(tz)
    current_time = now.time()

    start = time(int(start_str[:2]), int(start_str[3:]))
    end = time(int(end_str[:2]), int(end_str[3:]))

    if start <= end:
        return start <= current_time <= end
    else:
        # Wraps midnight
        return current_time >= start or current_time <= end


def _should_page_sev1_off_hours(db: Session, user_id: int, queue_id: int) -> bool:
    """Check if user has opted out of SEV1 pages outside pageable hours."""
    settings = (
        db.query(UserQueueSettings)
        .filter(
            UserQueueSettings.user_id == user_id,
            UserQueueSettings.queue_id == queue_id,
        )
        .first()
    )
    if not settings:
        return True  # Default: SEV1 pages always
    return not settings.sev1_off_hours_opt_out


def trigger_page_for_ticket(db: Session, ticket: Ticket) -> None:
    """Send a disruptive page to the ticket's assignee."""
    if ticket.priority not in (TicketPriority.SEV1, TicketPriority.SEV2):
        return

    user_id = ticket.assignee_id
    queue_id = ticket.queue_id
    within_hours = _is_within_pageable_hours(db, user_id, queue_id)

    if ticket.priority == TicketPriority.SEV2 and not within_hours:
        return

    if ticket.priority == TicketPriority.SEV1 and not within_hours:
        if not _should_page_sev1_off_hours(db, user_id, queue_id):
            return

    tokens = _get_user_device_tokens(db, user_id)
    data = {
        "type": "page",
        "ticket_id": str(ticket.id),
        "title": ticket.title,
        "priority": ticket.priority.value,
        "status": ticket.status.value,
    }
    for token in tokens:
        send_page(token, data)

    logger.info("Page sent for ticket %s (%s) to user %s", ticket.id, ticket.priority.value, user_id)
