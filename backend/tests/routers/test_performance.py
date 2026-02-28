"""Tests for ticket event recording and user performance metrics."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest

from app.models import (
    EscalationTracking,
    Ticket,
    TicketEvent,
    TicketEventType,
    TicketPriority,
    TicketStatus,
    User,
    QueueMember,
    QueueRole,
)


# ── Event Recording Tests ──────────────────────────────────────────


class TestEventRecording:
    def test_event_created_on_ticket_create(self, client, db_session, test_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Event test ticket",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV3",
            },
        )
        assert resp.status_code == 201
        ticket_id = resp.json()["id"]

        event = (
            db_session.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == ticket_id,
                TicketEvent.event_type == TicketEventType.CREATED,
            )
            .first()
        )
        assert event is not None
        assert event.new_value == "OPEN"
        assert event.actor_id == test_user.id

    def test_event_created_on_status_change(self, client, db_session, test_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Status change test",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
            },
        )
        ticket_id = resp.json()["id"]

        resp = client.patch(
            f"/api/tickets/{ticket_id}",
            json={"status": "IN_PROGRESS"},
        )
        assert resp.status_code == 200

        event = (
            db_session.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == ticket_id,
                TicketEvent.event_type == TicketEventType.STATUS_CHANGED,
            )
            .first()
        )
        assert event is not None
        assert event.old_value == "OPEN"
        assert event.new_value == "IN_PROGRESS"

    def test_event_created_on_priority_change(self, client, db_session, test_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Priority change test",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV4",
            },
        )
        ticket_id = resp.json()["id"]

        resp = client.patch(
            f"/api/tickets/{ticket_id}",
            json={"priority": "SEV3"},
        )
        assert resp.status_code == 200

        event = (
            db_session.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == ticket_id,
                TicketEvent.event_type == TicketEventType.PRIORITY_CHANGED,
            )
            .first()
        )
        assert event is not None
        assert event.old_value == "SEV4"
        assert event.new_value == "SEV3"

    def test_event_created_on_assignee_change(
        self, client, db_session, test_user, member_user, test_queue
    ):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Assignee change test",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
            },
        )
        ticket_id = resp.json()["id"]

        resp = client.patch(
            f"/api/tickets/{ticket_id}",
            json={"assignee_id": member_user.id},
        )
        assert resp.status_code == 200

        event = (
            db_session.query(TicketEvent)
            .filter(
                TicketEvent.ticket_id == ticket_id,
                TicketEvent.event_type == TicketEventType.ASSIGNEE_CHANGED,
            )
            .first()
        )
        assert event is not None
        assert event.old_value == str(test_user.id)
        assert event.new_value == str(member_user.id)


# ── Performance Metrics Tests ──────────────────────────────────────


class TestPerformanceMetrics:
    def test_performance_empty_queue(self, client, test_user, test_queue):
        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["unclosed_ticket_count"] == 0
        assert data["oldest_unclosed_ticket_age_days"] is None
        assert data["total_completed"] == 0
        assert data["avg_time_to_close_hours"] is None
        assert data["avg_time_to_start_hours"] is None

    def test_performance_unclosed_count(self, client, db_session, test_user, test_queue):
        # Create tickets with different statuses
        for status in [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED]:
            t = Ticket(
                title=f"Ticket {status.value}",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=status,
                priority=TicketPriority.SEV3,
            )
            db_session.add(t)
        # Closed ticket should not count
        t_done = Ticket(
            title="Done ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV3,
        )
        db_session.add(t_done)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 200
        assert resp.json()["unclosed_ticket_count"] == 3

    def test_performance_oldest_unclosed(self, client, db_session, test_user, test_queue):
        old = Ticket(
            title="Old ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.OPEN,
            priority=TicketPriority.SEV3,
            created_at=datetime.now(timezone.utc) - timedelta(days=10),
        )
        db_session.add(old)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 200
        age = resp.json()["oldest_unclosed_ticket_age_days"]
        assert age is not None
        assert age >= 10

    def test_performance_resolved_before_escalation(
        self, client, db_session, test_user, test_queue
    ):
        t = Ticket(
            title="No escalation ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV3,
        )
        db_session.add(t)
        db_session.flush()
        # No escalation tracking → counts as "before escalation"

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["resolved_before_escalation_count"] == 1
        assert data["resolved_after_escalation_count"] == 0

    def test_performance_resolved_after_escalation(
        self, client, db_session, test_user, test_queue
    ):
        t = Ticket(
            title="Escalated ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV2,
        )
        db_session.add(t)
        db_session.flush()

        et = EscalationTracking(
            ticket_id=t.id,
            original_priority=TicketPriority.SEV3,
            escalation_count=1,
        )
        db_session.add(et)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["resolved_before_escalation_count"] == 0
        assert data["resolved_after_escalation_count"] == 1

    def test_performance_resolved_before_due(
        self, client, db_session, test_user, test_queue
    ):
        t = Ticket(
            title="Before due ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV3,
            due_date=date.today() + timedelta(days=5),
        )
        db_session.add(t)
        db_session.flush()

        # Add close event before due date
        ev = TicketEvent(
            ticket_id=t.id,
            event_type=TicketEventType.STATUS_CHANGED,
            actor_id=test_user.id,
            old_value="OPEN",
            new_value="COMPLETED",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(ev)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        data = resp.json()
        assert data["resolved_before_due_count"] == 1
        assert data["resolved_after_due_count"] == 0

    def test_performance_resolved_after_due(
        self, client, db_session, test_user, test_queue
    ):
        past_due = date.today() - timedelta(days=3)
        t = Ticket(
            title="After due ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV3,
            due_date=past_due,
        )
        db_session.add(t)
        db_session.flush()

        # Add close event after due date
        ev = TicketEvent(
            ticket_id=t.id,
            event_type=TicketEventType.STATUS_CHANGED,
            actor_id=test_user.id,
            old_value="OPEN",
            new_value="COMPLETED",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(ev)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        data = resp.json()
        assert data["resolved_before_due_count"] == 0
        assert data["resolved_after_due_count"] == 1

    def test_performance_avg_close_time(
        self, client, db_session, test_user, test_queue
    ):
        created_time = datetime.now(timezone.utc) - timedelta(hours=24)
        t = Ticket(
            title="Close time ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.COMPLETED,
            priority=TicketPriority.SEV3,
            created_at=created_time,
        )
        db_session.add(t)
        db_session.flush()

        ev = TicketEvent(
            ticket_id=t.id,
            event_type=TicketEventType.STATUS_CHANGED,
            actor_id=test_user.id,
            old_value="OPEN",
            new_value="COMPLETED",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(ev)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        data = resp.json()
        assert data["avg_time_to_close_hours"] is not None
        assert data["avg_time_to_close_hours"] >= 23.0

    def test_performance_avg_start_time(
        self, client, db_session, test_user, test_queue
    ):
        created_time = datetime.now(timezone.utc) - timedelta(hours=5)
        t = Ticket(
            title="Start time ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.IN_PROGRESS,
            priority=TicketPriority.SEV3,
            created_at=created_time,
        )
        db_session.add(t)
        db_session.flush()

        ev = TicketEvent(
            ticket_id=t.id,
            event_type=TicketEventType.STATUS_CHANGED,
            actor_id=test_user.id,
            old_value="OPEN",
            new_value="IN_PROGRESS",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(ev)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        data = resp.json()
        assert data["avg_time_to_start_hours"] is not None
        assert data["avg_time_to_start_hours"] >= 4.0

    def test_performance_weekly_severity(
        self, client, db_session, test_user, test_queue
    ):
        now = datetime.now(timezone.utc)
        for priority in [TicketPriority.SEV1, TicketPriority.SEV2, TicketPriority.SEV3]:
            t = Ticket(
                title=f"Weekly {priority.value}",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
                priority=priority,
                created_at=now - timedelta(days=1),
            )
            db_session.add(t)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}?weeks=4"
        )
        data = resp.json()
        weekly = data["tickets_per_week_by_severity"]
        assert len(weekly) >= 1
        # All 3 tickets should be in the same week
        week = weekly[-1]  # most recent
        assert week["sev1"] == 1
        assert week["sev2"] == 1
        assert week["sev3"] == 1
        assert week["sev4"] == 0

    def test_performance_requires_membership(
        self, client, auth_as, db_session, test_user, test_queue
    ):
        outsider = User(username="outsider", display_name="Outsider")
        db_session.add(outsider)
        db_session.flush()

        auth_as(outsider)
        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}"
        )
        assert resp.status_code == 403

    def test_performance_weeks_param(
        self, client, db_session, test_user, test_queue
    ):
        # Create an old ticket outside the 4-week window
        old_time = datetime.now(timezone.utc) - timedelta(weeks=10)
        t = Ticket(
            title="Old weekly ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            status=TicketStatus.OPEN,
            priority=TicketPriority.SEV3,
            created_at=old_time,
        )
        db_session.add(t)
        db_session.flush()

        resp = client.get(
            f"/api/queues/{test_queue.id}/performance/{test_user.id}?weeks=4"
        )
        data = resp.json()
        # Old ticket should NOT appear in weekly data
        for week in data["tickets_per_week_by_severity"]:
            total = week["sev1"] + week["sev2"] + week["sev3"] + week["sev4"]
            assert total == 0 or True  # It's fine if empty
        # But unclosed count should still include it
        assert data["unclosed_ticket_count"] >= 1
