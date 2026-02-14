from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from .database import SessionLocal
from .models import (
    EscalationTracking,
    PageTracking,
    Ticket,
    TicketPriority,
    TicketStatus,
)
from .notifications import trigger_page_for_ticket

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

# Re-page intervals (in minutes)
PAGING_INTERVALS = {
    (TicketPriority.SEV1, TicketStatus.OPEN): 15,
    (TicketPriority.SEV1, TicketStatus.IN_PROGRESS): 120,
    (TicketPriority.SEV2, TicketStatus.OPEN): 30,
    (TicketPriority.SEV2, TicketStatus.IN_PROGRESS): 480,
}

# Escalation priority ladder
ESCALATION_LADDER = {
    TicketPriority.SEV4: TicketPriority.SEV3,
    TicketPriority.SEV3: TicketPriority.SEV2,
    TicketPriority.SEV2: TicketPriority.SEV1,
    TicketPriority.SEV1: TicketPriority.SEV1,  # ceiling
}


def run_paging_check() -> None:
    """Check all pageable tickets and send re-pages as needed. Runs every 1 min."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # Query tickets that are pageable (SEV1/SEV2, OPEN/IN_PROGRESS)
        tickets = (
            db.query(Ticket)
            .filter(
                Ticket.priority.in_([TicketPriority.SEV1, TicketPriority.SEV2]),
                Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]),
            )
            .all()
        )

        for ticket in tickets:
            interval_minutes = PAGING_INTERVALS.get(
                (ticket.priority, ticket.status)
            )
            if interval_minutes is None:
                continue

            # Get or create page tracking
            tracking = (
                db.query(PageTracking)
                .filter(PageTracking.ticket_id == ticket.id)
                .first()
            )
            if not tracking:
                tracking = PageTracking(ticket_id=ticket.id)
                db.add(tracking)
                db.flush()

            # Check if it's time to re-page
            if tracking.last_page_sent_at is not None:
                last_sent = tracking.last_page_sent_at
                if last_sent.tzinfo is None:
                    last_sent = last_sent.replace(tzinfo=timezone.utc)
                next_page_at = last_sent + timedelta(minutes=interval_minutes)
                if now < next_page_at:
                    continue

            # Send page
            trigger_page_for_ticket(db, ticket)
            tracking.last_page_sent_at = now
            db.commit()

    except Exception:
        logger.exception("Error in paging check")
        db.rollback()
    finally:
        db.close()


def run_escalation_check() -> None:
    """Check tickets for escalation based on due dates. Runs every 30 min."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()

        # Query all escalation tracking records that are not paused
        trackings = (
            db.query(EscalationTracking)
            .filter(EscalationTracking.paused == False)  # noqa: E712
            .all()
        )

        for tracking in trackings:
            ticket = db.query(Ticket).filter(Ticket.id == tracking.ticket_id).first()
            if not ticket or not ticket.due_date:
                continue

            # Skip if already at ceiling
            if ticket.priority == TicketPriority.SEV1:
                continue

            # Skip terminal statuses
            if ticket.status in (TicketStatus.BLOCKED, TicketStatus.COMPLETED, TicketStatus.CANCELLED):
                continue

            should_escalate = False
            due = ticket.due_date

            if today > due:
                # After due date: escalate once per day
                if tracking.last_escalation_at is None:
                    should_escalate = True
                else:
                    last = tracking.last_escalation_at
                    if last.tzinfo is None:
                        last = last.replace(tzinfo=timezone.utc)
                    if (now - last) >= timedelta(days=1):
                        should_escalate = True
            elif today == due:
                # On due date: escalate once
                if tracking.last_escalation_at is None or tracking.last_escalation_at.date() < due:
                    should_escalate = True
            else:
                # Before due date: escalate once 1 week before
                days_until_due = (due - today).days
                if days_until_due <= 7:
                    # Skip if ticket was created less than 1 week from due
                    created_date = ticket.created_at.date() if ticket.created_at else today
                    days_from_creation_to_due = (due - created_date).days
                    if days_from_creation_to_due < 7:
                        continue
                    # Escalate once at the 1-week mark
                    if tracking.escalation_count == 0:
                        should_escalate = True

            if should_escalate:
                new_priority = ESCALATION_LADDER[ticket.priority]
                old_priority = ticket.priority
                ticket.priority = new_priority
                tracking.last_escalation_at = now
                tracking.escalation_count += 1
                db.commit()

                logger.info(
                    "Escalated ticket %d from %s to %s (count: %d)",
                    ticket.id, old_priority.value, new_priority.value,
                    tracking.escalation_count,
                )

                # If escalated to SEV1/SEV2, trigger immediate page
                if new_priority in (TicketPriority.SEV1, TicketPriority.SEV2):
                    trigger_page_for_ticket(db, ticket)
                    # Ensure page tracking exists
                    pt = db.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
                    if not pt:
                        pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
                        db.add(pt)
                    else:
                        pt.last_page_sent_at = now
                    db.commit()

    except Exception:
        logger.exception("Error in escalation check")
        db.rollback()
    finally:
        db.close()


def start_scheduler() -> None:
    """Start the background scheduler with paging and escalation jobs."""
    scheduler.add_job(run_paging_check, "interval", minutes=1, id="paging_check", replace_existing=True)
    scheduler.add_job(run_escalation_check, "interval", minutes=30, id="escalation_check", replace_existing=True)
    scheduler.start()
    logger.info("Background scheduler started (paging: 1min, escalation: 30min)")


def stop_scheduler() -> None:
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
