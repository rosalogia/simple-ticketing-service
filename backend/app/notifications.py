from __future__ import annotations

import logging
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from .fcm import send_notification, send_page
from .models import (
    Comment,
    DEFAULT_SCHEDULE,
    DeviceToken,
    Notification,
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


def _get_user_name(db: Session, user_id: int) -> str:
    from .models import User
    user = db.query(User).filter(User.id == user_id).first()
    return user.display_name if user else "Someone"


def _create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    body: str,
    ticket_id: int | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        ticket_id=ticket_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_ticket_assigned(db: Session, ticket: Ticket) -> None:
    """Notify assignee when they are assigned a ticket."""
    if ticket.assignee_id == ticket.assigner_id:
        return
    assigner_name = _get_user_name(db, ticket.assigner_id)
    priority = ticket.priority.value
    title = f"[{priority}] Assigned to you"
    body = f"{assigner_name} assigned you: {ticket.title}"
    data = {"type": "ticket_assigned", "ticket_id": str(ticket.id)}
    _send_to_user(db, ticket.assignee_id, title, body, data)
    _create_notification(db, ticket.assignee_id, "assignment", title, body, ticket.id)


def notify_ticket_reassigned(
    db: Session, ticket: Ticket, old_assignee_id: int, new_assignee_id: int
) -> None:
    """Notify old and new assignee on reassignment."""
    data = {"type": "ticket_reassigned", "ticket_id": str(ticket.id)}
    if old_assignee_id != new_assignee_id:
        new_name = _get_user_name(db, new_assignee_id)
        old_title = "Ticket Reassigned"
        old_body = f"{ticket.title} reassigned to {new_name}"
        _send_to_user(db, old_assignee_id, old_title, old_body, data)
        _create_notification(db, old_assignee_id, "assignment", old_title, old_body, ticket.id)

        old_name = _get_user_name(db, old_assignee_id)
        priority = ticket.priority.value
        new_title = f"[{priority}] Assigned to you"
        new_body = f"{ticket.title} (reassigned from {old_name})"
        _send_to_user(db, new_assignee_id, new_title, new_body, data)
        _create_notification(db, new_assignee_id, "assignment", new_title, new_body, ticket.id)


def _resolve_assigner_id(db: Session, ticket: Ticket) -> int:
    """Return the real user to notify: on_behalf_of if assigner is a bot, else assigner."""
    from .models import User
    assigner = db.query(User).filter(User.id == ticket.assigner_id).first()
    if assigner and assigner.is_bot and ticket.on_behalf_of_id:
        return ticket.on_behalf_of_id
    return ticket.assigner_id


def notify_status_changed(db: Session, ticket: Ticket, changed_by_id: int) -> None:
    """Notify assigner when assignee changes ticket status."""
    notify_id = _resolve_assigner_id(db, ticket)
    if changed_by_id == notify_id:
        return
    changer_name = _get_user_name(db, changed_by_id)
    title = f"{ticket.title}"
    body = f"{changer_name} changed status to {ticket.status.value}"
    data = {"type": "status_changed", "ticket_id": str(ticket.id)}
    _send_to_user(db, notify_id, title, body, data)
    _create_notification(db, notify_id, "status_change", title, body, ticket.id)


def notify_comment_added(
    db: Session, ticket: Ticket, commenter_id: int, comment_body: str,
) -> None:
    """Notify assigner, assignee, and prior commenters on comments (excluding own)."""
    from .models import User
    commenter = db.query(User).filter(User.id == commenter_id).first()
    commenter_name = commenter.display_name if commenter else "Someone"
    preview = comment_body[:100] + ("..." if len(comment_body) > 100 else "")
    data = {"type": "comment_added", "ticket_id": str(ticket.id)}
    title = f"Comment on: {ticket.title}"
    body = f"{commenter_name}: {preview}"
    assigner_id = _resolve_assigner_id(db, ticket)

    # Gather all prior commenters (resolve on_behalf_of for bot comments)
    prior_comments = (
        db.query(Comment.user_id, Comment.on_behalf_of_id)
        .filter(Comment.ticket_id == ticket.id)
        .distinct()
        .all()
    )
    prior_commenter_ids: set[int] = set()
    for uid, on_behalf_of_id in prior_comments:
        # Check if user is a bot with on_behalf_of
        if on_behalf_of_id:
            prior_commenter_ids.add(on_behalf_of_id)
        else:
            prior_commenter_ids.add(uid)

    recipients = ({assigner_id, ticket.assignee_id} | prior_commenter_ids) - {commenter_id}
    for user_id in recipients:
        _send_to_user(db, user_id, title, body, data)
        _create_notification(db, user_id, "comment", title, body, ticket.id)


def notify_escalation(db: Session, ticket: Ticket, old_priority: str, new_priority: str) -> None:
    """Notify assignee when ticket is auto-escalated."""
    title = f"Ticket Escalated: {ticket.title}"
    body = f"Priority changed from {old_priority} to {new_priority}"
    data = {"type": "escalation", "ticket_id": str(ticket.id)}
    _send_to_user(db, ticket.assignee_id, title, body, data)
    _create_notification(db, ticket.assignee_id, "escalation", title, body, ticket.id)


def notify_queue_invite(db: Session, invite) -> None:
    """Notify invitee when they are invited to a queue."""
    inviter_name = _get_user_name(db, invite.invited_by)
    queue_name = invite.queue.name if invite.queue else "a queue"
    data = {"type": "queue_invite", "invite_id": str(invite.id)}
    _send_to_user(
        db, invite.user_id,
        "Queue Invitation",
        f"{inviter_name} invited you to {queue_name}",
        data,
    )


def _get_user_schedule(
    db: Session, user_id: int, queue_id: int
) -> tuple[dict, ZoneInfo]:
    """Return (schedule, timezone) for a user's queue settings."""
    settings = (
        db.query(UserQueueSettings)
        .filter(
            UserQueueSettings.user_id == user_id,
            UserQueueSettings.queue_id == queue_id,
        )
        .first()
    )

    schedule = settings.schedule if settings else DEFAULT_SCHEDULE
    tz_name = settings.timezone if settings else "America/New_York"

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("America/New_York")

    return schedule, tz


DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _is_within_pageable_hours(
    db: Session, user_id: int, queue_id: int
) -> bool:
    """Check if current time is within the user's pageable hours for this queue."""
    schedule, tz = _get_user_schedule(db, user_id, queue_id)

    now = datetime.now(tz)
    current_time = now.time()

    day_key = DAY_KEYS[now.weekday()]

    day_config = schedule.get(day_key) if schedule else None
    if not day_config:
        return False

    start_str = day_config["start"]
    end_str = day_config["end"]

    start = time(int(start_str[:2]), int(start_str[3:]))
    end = time(int(end_str[:2]), int(end_str[3:]))

    if start <= end:
        return start <= current_time <= end
    else:
        # Wraps midnight
        return current_time >= start or current_time <= end


def _next_pageable_hours_start(
    db: Session, user_id: int, queue_id: int
) -> datetime | None:
    """Return UTC datetime of the next pageable window start.

    Returns None if the user is currently within pageable hours.
    Iterates forward up to 7 days through the schedule.
    """
    schedule, tz = _get_user_schedule(db, user_id, queue_id)
    now = datetime.now(tz)

    # Check if currently within hours
    current_time = now.time()
    day_key = DAY_KEYS[now.weekday()]
    day_config = schedule.get(day_key) if schedule else None
    if day_config:
        start_str = day_config["start"]
        end_str = day_config["end"]
        start = time(int(start_str[:2]), int(start_str[3:]))
        end = time(int(end_str[:2]), int(end_str[3:]))
        if start <= end:
            if start <= current_time <= end:
                return None
        else:
            if current_time >= start or current_time <= end:
                return None

    # Check rest of today first — if before start time today
    if day_config:
        start = time(int(day_config["start"][:2]), int(day_config["start"][3:]))
        if current_time < start:
            candidate = now.replace(
                hour=start.hour, minute=start.minute, second=0, microsecond=0
            )
            return candidate.astimezone(timezone.utc)

    # Iterate forward up to 7 days
    for offset in range(1, 8):
        future = now + timedelta(days=offset)
        day_key = DAY_KEYS[future.weekday()]
        day_config = schedule.get(day_key) if schedule else None
        if not day_config:
            continue
        start_str = day_config["start"]
        start = time(int(start_str[:2]), int(start_str[3:]))
        candidate = future.replace(
            hour=start.hour, minute=start.minute, second=0, microsecond=0
        )
        return candidate.astimezone(timezone.utc)

    return None


def _advance_past_off_hours(
    db: Session, user_id: int, queue_id: int, candidate_utc: datetime
) -> datetime:
    """If candidate_utc falls outside pageable hours, advance to the next window start."""
    schedule, tz = _get_user_schedule(db, user_id, queue_id)

    if candidate_utc.tzinfo is None:
        candidate_utc = candidate_utc.replace(tzinfo=timezone.utc)

    candidate_local = candidate_utc.astimezone(tz)
    current_time = candidate_local.time()
    day_key = DAY_KEYS[candidate_local.weekday()]
    day_config = schedule.get(day_key) if schedule else None

    # Check if candidate is within hours
    within = False
    if day_config:
        start_str = day_config["start"]
        end_str = day_config["end"]
        start = time(int(start_str[:2]), int(start_str[3:]))
        end = time(int(end_str[:2]), int(end_str[3:]))
        if start <= end:
            within = start <= current_time <= end
        else:
            within = current_time >= start or current_time <= end

    if within:
        return candidate_utc

    # Check rest of the candidate day — if before start time
    if day_config:
        start = time(int(day_config["start"][:2]), int(day_config["start"][3:]))
        if current_time < start:
            result = candidate_local.replace(
                hour=start.hour, minute=start.minute, second=0, microsecond=0
            )
            return result.astimezone(timezone.utc)

    # Iterate forward up to 7 days from the candidate
    for offset in range(1, 8):
        future = candidate_local + timedelta(days=offset)
        fday_key = DAY_KEYS[future.weekday()]
        fday_config = schedule.get(fday_key) if schedule else None
        if not fday_config:
            continue
        start_str = fday_config["start"]
        start = time(int(start_str[:2]), int(start_str[3:]))
        result = future.replace(
            hour=start.hour, minute=start.minute, second=0, microsecond=0
        )
        return result.astimezone(timezone.utc)

    # Fallback: return unchanged
    return candidate_utc


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


def trigger_page_for_ticket(
    db: Session, ticket: Ticket, force: bool = False, notify_only: bool = False
) -> None:
    """Send a disruptive page to the ticket's assignee.

    force=True: skip pageable hours check, send disruptive page.
    notify_only=True: skip pageable hours check, send standard push instead of alarm-style page.
    """
    logger.warning("trigger_page_for_ticket: ticket=%s priority=%s status=%s force=%s notify_only=%s", ticket.id, ticket.priority, ticket.status, force, notify_only)
    if ticket.priority not in (TicketPriority.SEV1, TicketPriority.SEV2):
        logger.warning("Page skipped: priority %s not pageable", ticket.priority)
        return

    user_id = ticket.assignee_id
    queue_id = ticket.queue_id

    if not force and not notify_only:
        within_hours = _is_within_pageable_hours(db, user_id, queue_id)
        logger.warning("Page check: user=%s queue=%s within_hours=%s", user_id, queue_id, within_hours)

        if ticket.priority == TicketPriority.SEV2 and not within_hours:
            logger.warning("SEV2 page skipped: outside pageable hours")
            return

        if ticket.priority == TicketPriority.SEV1 and not within_hours:
            if not _should_page_sev1_off_hours(db, user_id, queue_id):
                logger.warning("SEV1 page skipped: user opted out off-hours")
                return

    tokens = _get_user_device_tokens(db, user_id)
    logger.warning("Page: found %d device tokens for user %s", len(tokens), user_id)

    title = f"[{ticket.priority.value}] Page: {ticket.title}"
    body = f"You are being paged for {ticket.priority.value} ticket: {ticket.title}"
    data = {
        "type": "page",
        "ticket_id": str(ticket.id),
        "title": ticket.title,
        "priority": ticket.priority.value,
        "status": ticket.status.value,
    }

    if notify_only:
        # Standard OS push notification instead of alarm-style page
        for token in tokens:
            result = send_notification(token, title, body, data)
            logger.warning("send_notification result: %s", result)
    else:
        for token in tokens:
            result = send_page(token, data)
            logger.warning("send_page result: %s", result)

    # Create in-app page notification
    _create_notification(db, user_id, "page", title, body, ticket.id)

    # Create in-app page notification
    title = f"[{ticket.priority.value}] Page: {ticket.title}"
    body = f"You are being paged for {ticket.priority.value} ticket: {ticket.title}"
    _create_notification(db, user_id, "page", title, body, ticket.id)

    logger.warning("Page sent for ticket %s (%s) to user %s", ticket.id, ticket.priority.value, user_id)
