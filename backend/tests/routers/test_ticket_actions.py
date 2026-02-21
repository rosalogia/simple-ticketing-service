"""Tests for ticket escalation, paging, and acknowledge actions."""

from __future__ import annotations

import pytest

from app.models import (
    EscalationTracking,
    PageTracking,
    Ticket,
    TicketPriority,
    TicketStatus,
)


class TestEscalateTicket:
    def test_escalate_sev4_to_sev3(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Escalate me",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV4,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/escalate")
        assert resp.status_code == 200
        assert resp.json()["priority"] == "SEV3"

    def test_escalate_to_sev1_creates_page_tracking(
        self, client, db_session, test_user, test_queue
    ):
        ticket = Ticket(
            title="Escalate to SEV1",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV2,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/escalate")
        assert resp.status_code == 200
        assert resp.json()["priority"] == "SEV1"

        pt = db_session.query(PageTracking).filter(PageTracking.ticket_id == ticket.id).first()
        assert pt is not None

    def test_already_sev1_fails(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Already SEV1",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/escalate")
        assert resp.status_code == 400


class TestPageTicket:
    def test_page_sev1_success(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Page me",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/page")
        assert resp.status_code == 200

    def test_page_sev3_fails(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="SEV3 no page",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV3,
            status=TicketStatus.OPEN,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/page")
        assert resp.status_code == 400

    def test_page_completed_ticket_fails(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Done ticket",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
            status=TicketStatus.COMPLETED,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/page")
        assert resp.status_code == 400


class TestAcknowledgeTicket:
    def test_acknowledge_success(self, client, test_user, test_queue, db_session):
        ticket = Ticket(
            title="Ack me",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV1,
        )
        db_session.add(ticket)
        db_session.flush()

        pt = PageTracking(ticket_id=ticket.id)
        db_session.add(pt)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/acknowledge")
        assert resp.status_code == 200
        assert resp.json()["status"] == "acknowledged"

    def test_acknowledge_without_tracking_fails(
        self, client, test_user, test_queue, db_session
    ):
        ticket = Ticket(
            title="No tracking",
            queue_id=test_queue.id,
            assignee_id=test_user.id,
            assigner_id=test_user.id,
            priority=TicketPriority.SEV3,
        )
        db_session.add(ticket)
        db_session.flush()

        resp = client.post(f"/api/tickets/{ticket.id}/acknowledge")
        assert resp.status_code == 404
