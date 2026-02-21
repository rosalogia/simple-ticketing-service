"""Tests for escalation & paging scheduler logic."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from freezegun import freeze_time

from app.models import (
    EscalationTracking,
    PageTracking,
    Ticket,
    TicketPriority,
    TicketStatus,
)
from app.scheduler import (
    ESCALATION_LADDER,
    PAGING_INTERVALS,
    run_escalation_check,
    run_paging_check,
)


class TestPagingIntervals:
    def test_sev1_open_interval(self):
        assert PAGING_INTERVALS[(TicketPriority.SEV1, TicketStatus.OPEN)] == 15

    def test_sev1_in_progress_interval(self):
        assert PAGING_INTERVALS[(TicketPriority.SEV1, TicketStatus.IN_PROGRESS)] == 120

    def test_sev2_open_interval(self):
        assert PAGING_INTERVALS[(TicketPriority.SEV2, TicketStatus.OPEN)] == 30

    def test_sev2_in_progress_interval(self):
        assert PAGING_INTERVALS[(TicketPriority.SEV2, TicketStatus.IN_PROGRESS)] == 480


class TestEscalationLadder:
    def test_sev4_to_sev3(self):
        assert ESCALATION_LADDER[TicketPriority.SEV4] == TicketPriority.SEV3

    def test_sev3_to_sev2(self):
        assert ESCALATION_LADDER[TicketPriority.SEV3] == TicketPriority.SEV2

    def test_sev2_to_sev1(self):
        assert ESCALATION_LADDER[TicketPriority.SEV2] == TicketPriority.SEV1

    def test_sev1_ceiling(self):
        assert ESCALATION_LADDER[TicketPriority.SEV1] == TicketPriority.SEV1


class _NoCloseSession:
    """Wraps a real session but makes close() a no-op for scheduler tests."""

    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        if name == "close":
            return lambda: None
        return getattr(self._session, name)


class TestRunEscalationCheck:
    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_escalation_on_due_date(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Due today",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
            status=TicketStatus.OPEN,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV4,
            escalation_count=0,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV3

    @freeze_time("2025-01-16 12:00:00", tz_offset=0)
    def test_escalation_after_due_date(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Overdue",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
            status=TicketStatus.OPEN,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV4,
            escalation_count=0,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV3

    @freeze_time("2025-01-08 12:00:00", tz_offset=0)
    def test_escalation_7_days_before_due(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Due in 7 days",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
            status=TicketStatus.OPEN,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV4,
            escalation_count=0,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV3

    @freeze_time("2025-01-10 12:00:00", tz_offset=0)
    def test_short_window_tickets_skipped(self, db_session, test_user, test_queue):
        """Tickets created less than 7 days before due should not be escalated at week mark."""
        ticket = Ticket(
            title="Short window",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
            status=TicketStatus.OPEN,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 9, tzinfo=timezone.utc),  # 6 days before due
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV4,
            escalation_count=0,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV4  # Not escalated

    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_paused_tickets_skipped(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Blocked ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
            status=TicketStatus.BLOCKED,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV4,
            escalation_count=0,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV4

    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_stops_at_sev1(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="Already SEV1",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
            due_date=date(2025, 1, 15),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        db_session.add(ticket)
        db_session.flush()

        tracking = EscalationTracking(
            ticket_id=ticket.id,
            original_priority=TicketPriority.SEV1,
            escalation_count=3,
            paused=False,
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket"):
                run_escalation_check()

        db_session.refresh(ticket)
        assert ticket.priority == TicketPriority.SEV1
        db_session.refresh(tracking)
        assert tracking.escalation_count == 3  # unchanged


class TestRunPagingCheck:
    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_pages_sev1_open_ticket(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV1 ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket") as mock_page:
                run_paging_check()
                mock_page.assert_called_once()

    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_no_repage_before_interval(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV1 recently paged",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        # Last page was 10 minutes ago (interval is 15 minutes for SEV1 OPEN)
        tracking = PageTracking(
            ticket_id=ticket.id,
            last_page_sent_at=datetime(2025, 1, 15, 11, 50, tzinfo=timezone.utc),
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket") as mock_page:
                run_paging_check()
                mock_page.assert_not_called()

    @freeze_time("2025-01-15 12:00:00", tz_offset=0)
    def test_repage_after_interval(self, db_session, test_user, test_queue):
        ticket = Ticket(
            title="SEV1 ready for repage",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        # Last page was 20 minutes ago (interval is 15 minutes for SEV1 OPEN)
        tracking = PageTracking(
            ticket_id=ticket.id,
            last_page_sent_at=datetime(2025, 1, 15, 11, 40, tzinfo=timezone.utc),
        )
        db_session.add(tracking)
        db_session.commit()

        wrapper = _NoCloseSession(db_session)
        with patch("app.scheduler.SessionLocal", return_value=wrapper):
            with patch("app.scheduler.trigger_page_for_ticket") as mock_page:
                run_paging_check()
                mock_page.assert_called_once()
