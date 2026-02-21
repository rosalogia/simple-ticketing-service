"""Integration tests for ticket CRUD endpoints."""

from __future__ import annotations

from datetime import date

import pytest

from app.models import (
    EscalationTracking,
    PageTracking,
    Ticket,
    TicketPriority,
    TicketStatus,
)


class TestCreateTicket:
    def test_create_success(self, client, test_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "New ticket",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV3",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "New ticket"
        assert data["priority"] == "SEV3"
        assert data["status"] == "OPEN"
        assert data["assignee"]["id"] == test_user.id

    def test_create_sev1_creates_page_tracking(self, client, db_session, test_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "SEV1 ticket",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV1",
            },
        )
        assert resp.status_code == 201
        ticket_id = resp.json()["id"]
        pt = db_session.query(PageTracking).filter(PageTracking.ticket_id == ticket_id).first()
        assert pt is not None

    def test_create_with_due_date_creates_escalation_tracking(
        self, client, db_session, test_user, test_queue
    ):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Due date ticket",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV3",
                "due_date": "2025-12-31",
            },
        )
        assert resp.status_code == 201
        ticket_id = resp.json()["id"]
        et = (
            db_session.query(EscalationTracking)
            .filter(EscalationTracking.ticket_id == ticket_id)
            .first()
        )
        assert et is not None
        assert et.original_priority == TicketPriority.SEV3

    def test_viewer_denied(self, client, auth_as, viewer_user, test_queue):
        auth_as(viewer_user)
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Viewer ticket",
                "assignee_id": viewer_user.id,
                "queue_id": test_queue.id,
            },
        )
        assert resp.status_code == 403

    def test_member_severity_constraint(self, client, auth_as, member_user, test_queue, db_session):
        # Set queue max severity to SEV3 for members
        test_queue.member_max_severity = TicketPriority.SEV3
        db_session.flush()

        auth_as(member_user)
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "High sev",
                "assignee_id": member_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV2",
            },
        )
        assert resp.status_code == 403

    def test_owner_bypasses_severity_constraint(
        self, client, test_user, test_queue, db_session
    ):
        test_queue.member_max_severity = TicketPriority.SEV3
        db_session.flush()

        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Owner high sev",
                "assignee_id": test_user.id,
                "queue_id": test_queue.id,
                "priority": "SEV1",
            },
        )
        assert resp.status_code == 201

    def test_non_member_denied(self, client, auth_as, other_user, test_queue):
        auth_as(other_user)
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "No access",
                "assignee_id": other_user.id,
                "queue_id": test_queue.id,
            },
        )
        assert resp.status_code == 403

    def test_assignee_must_be_member(self, client, other_user, test_queue):
        resp = client.post(
            "/api/tickets/",
            json={
                "title": "Bad assignee",
                "assignee_id": other_user.id,
                "queue_id": test_queue.id,
            },
        )
        assert resp.status_code == 400


class TestListTickets:
    def test_list_with_pagination(self, client, test_user, test_queue, db_session):
        for i in range(5):
            db_session.add(
                Ticket(
                    title=f"Ticket {i}",
                    queue_id=test_queue.id,
                    assignee_id=test_user.id,
                    assigner_id=test_user.id,
                )
            )
        db_session.flush()

        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}&limit=3")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tickets"]) == 3
        assert data["total"] == 5

    def test_filter_by_status(self, client, test_user, test_queue, db_session):
        db_session.add(
            Ticket(
                title="Open",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
            )
        )
        db_session.add(
            Ticket(
                title="Completed",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.COMPLETED,
            )
        )
        db_session.flush()

        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}&status=OPEN")
        data = resp.json()
        assert all(t["status"] == "OPEN" for t in data["tickets"])

    def test_filter_by_priority(self, client, test_user, test_queue, db_session):
        db_session.add(
            Ticket(
                title="SEV1",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                priority=TicketPriority.SEV1,
            )
        )
        db_session.add(
            Ticket(
                title="SEV4",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                priority=TicketPriority.SEV4,
            )
        )
        db_session.flush()

        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}&priority=SEV1")
        data = resp.json()
        assert all(t["priority"] == "SEV1" for t in data["tickets"])

    def test_filter_by_search(self, client, test_user, test_queue, db_session):
        db_session.add(
            Ticket(
                title="Unique findme title",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
            )
        )
        db_session.add(
            Ticket(
                title="Other title",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
            )
        )
        db_session.flush()

        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}&search=findme")
        data = resp.json()
        assert data["total"] == 1
        assert data["tickets"][0]["title"] == "Unique findme title"

    def test_limit_capped_at_100(self, client, test_user, test_queue):
        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}&limit=200")
        assert resp.status_code == 200

    def test_includes_comment_count(self, client, test_user, test_queue, db_session):
        from app.models import Comment

        ticket = Ticket(
            title="With comments",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()
        db_session.add(Comment(ticket_id=ticket.id, user_id=test_user.id, content="c1"))
        db_session.add(Comment(ticket_id=ticket.id, user_id=test_user.id, content="c2"))
        db_session.flush()

        resp = client.get(f"/api/tickets/?queue_id={test_queue.id}")
        data = resp.json()
        t = next(t for t in data["tickets"] if t["id"] == ticket.id)
        assert t["comment_count"] == 2


class TestGetTicket:
    def test_get_success(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Get me",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.get(f"/api/tickets/{ticket.id}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Get me"

    def test_get_404(self, client):
        resp = client.get("/api/tickets/99999")
        assert resp.status_code == 404

    def test_non_member_denied(self, client, auth_as, other_user, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Private",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        auth_as(other_user)
        resp = client.get(f"/api/tickets/{ticket.id}")
        assert resp.status_code == 403


class TestUpdateTicket:
    def test_update_title(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Old title",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.patch(f"/api/tickets/{ticket.id}", json={"title": "New title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New title"

    def test_update_status(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Status change",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.patch(
            f"/api/tickets/{ticket.id}", json={"status": "IN_PROGRESS"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"

    def test_reassignment_to_non_member_fails(
        self, client, other_user, test_user, test_queue, db_session
    ):
        ticket = Ticket(
            title="Reassign",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.patch(
            f"/api/tickets/{ticket.id}", json={"assignee_id": other_user.id}
        )
        assert resp.status_code == 400

    def test_priority_upgrade_creates_page_tracking(
        self, client, db_session, test_user, test_queue
    ):
        ticket = Ticket(
            title="Upgrade priority",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV3,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.patch(f"/api/tickets/{ticket.id}", json={"priority": "SEV1"})
        assert resp.status_code == 200

        pt = db_session.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
        assert pt is not None


class TestDeleteTicket:
    def test_delete_success(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Delete me",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.delete(f"/api/tickets/{ticket.id}")
        assert resp.status_code == 204

    def test_delete_404(self, client):
        resp = client.delete("/api/tickets/99999")
        assert resp.status_code == 404

    def test_delete_non_member_denied(
        self, client, auth_as, other_user, test_user, test_queue, db_session
    ):
        ticket = Ticket(
            title="Cannot delete",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
        )
        db_session.add(ticket)
        db_session.flush()

        auth_as(other_user)
        resp = client.delete(f"/api/tickets/{ticket.id}")
        assert resp.status_code == 403


class TestTicketStats:
    def test_stats_counts(self, client, test_user, test_queue, db_session):
        db_session.add(
            Ticket(
                title="Open 1",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
            )
        )
        db_session.add(
            Ticket(
                title="Open 2",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
            )
        )
        db_session.add(
            Ticket(
                title="Completed",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.COMPLETED,
            )
        )
        db_session.flush()

        resp = client.get(f"/api/tickets/stats?queue_id={test_queue.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["open_count"] == 2
        assert data["completed_count"] == 1
        assert data["total"] == 3

    def test_stats_filter_by_assignee(self, client, test_user, member_user, test_queue, db_session):
        db_session.add(
            Ticket(
                title="Assigned to member",
                queue_id=test_queue.id,
                assignee_id=member_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
            )
        )
        db_session.add(
            Ticket(
                title="Assigned to owner",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                status=TicketStatus.OPEN,
            )
        )
        db_session.flush()

        resp = client.get(
            f"/api/tickets/stats?queue_id={test_queue.id}&assignee_id={member_user.id}"
        )
        data = resp.json()
        assert data["total"] == 1
