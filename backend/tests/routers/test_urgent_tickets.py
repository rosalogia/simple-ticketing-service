"""Tests for GET /api/tickets/urgent endpoint."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.models import (
    Queue,
    QueueMember,
    QueueRole,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
)


@pytest.fixture()
def second_queue(db_session, test_user):
    """A second queue where test_user is also a member."""
    queue = Queue(name="Second Queue", description="Another queue", created_by=test_user.id)
    db_session.add(queue)
    db_session.flush()
    db_session.add(QueueMember(queue_id=queue.id, user_id=test_user.id, role=QueueRole.OWNER))
    db_session.flush()
    return queue


def _create_ticket(
    db_session,
    *,
    queue,
    assignee,
    assigner,
    due_date=None,
    status=TicketStatus.OPEN,
    priority=TicketPriority.SEV3,
    title="Test ticket",
):
    ticket = Ticket(
        title=title,
        queue_id=queue.id,
        assignee_id=assignee.id,
        assigner_id=assigner.id,
        due_date=due_date,
        status=status,
        priority=priority,
    )
    db_session.add(ticket)
    db_session.flush()
    return ticket


class TestGetUrgentTickets:
    def test_empty_response(self, client, test_user, test_queue):
        """No tickets at all → empty response."""
        resp = client.get("/api/tickets/urgent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overdue"] == []
        assert data["due_soon"] == []
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 0

    def test_overdue_appears(self, client, db_session, test_user, test_queue):
        """Ticket with due_date in the past shows as overdue."""
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=yesterday)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 1
        assert data["due_soon_count"] == 0

    def test_due_soon_appears(self, client, db_session, test_user, test_queue):
        """Ticket due tomorrow shows as due_soon."""
        tomorrow = date.today() + timedelta(days=1)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=tomorrow)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 1

    def test_today_is_due_soon_not_overdue(self, client, db_session, test_user, test_queue):
        """Ticket due today should be due_soon, not overdue."""
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=date.today())
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 1

    def test_completed_excluded(self, client, db_session, test_user, test_queue):
        """COMPLETED tickets are excluded."""
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(
            db_session,
            queue=test_queue,
            assignee=test_user,
            assigner=test_user,
            due_date=yesterday,
            status=TicketStatus.COMPLETED,
        )
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 0

    def test_cancelled_excluded(self, client, db_session, test_user, test_queue):
        """CANCELLED tickets are excluded."""
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(
            db_session,
            queue=test_queue,
            assignee=test_user,
            assigner=test_user,
            due_date=yesterday,
            status=TicketStatus.CANCELLED,
        )
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0

    def test_no_due_date_excluded(self, client, db_session, test_user, test_queue):
        """Tickets without a due_date are excluded."""
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=None)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 0

    def test_far_future_excluded(self, client, db_session, test_user, test_queue):
        """Tickets due far in the future are excluded from due_soon."""
        far_future = date.today() + timedelta(days=30)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=far_future)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0
        assert data["due_soon_count"] == 0

    def test_cross_queue_works(self, client, db_session, test_user, test_queue, second_queue):
        """Tickets from multiple queues both appear."""
        yesterday = date.today() - timedelta(days=1)
        tomorrow = date.today() + timedelta(days=1)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=yesterday)
        _create_ticket(db_session, queue=second_queue, assignee=test_user, assigner=test_user, due_date=tomorrow)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 1
        assert data["due_soon_count"] == 1

    def test_only_assigned_to_me(self, client, db_session, test_user, other_user, test_queue):
        """Tickets assigned to other users don't appear."""
        # Add other_user to queue
        db_session.add(QueueMember(queue_id=test_queue.id, user_id=other_user.id, role=QueueRole.MEMBER))
        db_session.flush()
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(db_session, queue=test_queue, assignee=other_user, assigner=test_user, due_date=yesterday)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0

    def test_non_member_excluded(self, client, db_session, test_user, other_user):
        """Tickets in queues where user is not a member don't appear."""
        other_queue = Queue(name="Other Queue", created_by=other_user.id)
        db_session.add(other_queue)
        db_session.flush()
        db_session.add(QueueMember(queue_id=other_queue.id, user_id=other_user.id, role=QueueRole.OWNER))
        db_session.flush()
        # Create an overdue ticket assigned to test_user but test_user is NOT a member
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(db_session, queue=other_queue, assignee=test_user, assigner=other_user, due_date=yesterday)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue_count"] == 0

    def test_queue_name_populated(self, client, db_session, test_user, test_queue):
        """Each ticket in the response has queue_name set."""
        yesterday = date.today() - timedelta(days=1)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=yesterday)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["overdue"][0]["queue_name"] == "Test Queue"

    def test_three_day_boundary_included(self, client, db_session, test_user, test_queue):
        """Ticket due exactly 3 days from now is included in due_soon."""
        three_days = date.today() + timedelta(days=3)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=three_days)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["due_soon_count"] == 1

    def test_four_day_boundary_excluded(self, client, db_session, test_user, test_queue):
        """Ticket due 4 days from now is excluded from due_soon."""
        four_days = date.today() + timedelta(days=4)
        _create_ticket(db_session, queue=test_queue, assignee=test_user, assigner=test_user, due_date=four_days)
        resp = client.get("/api/tickets/urgent")
        data = resp.json()
        assert data["due_soon_count"] == 0
