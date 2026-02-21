"""Tests for comment endpoints."""

from __future__ import annotations

import pytest

from app.models import Comment, Ticket, TicketPriority, TicketStatus


@pytest.fixture()
def test_ticket(db_session, test_user, test_queue):
    ticket = Ticket(
        title="Comment test ticket",
        queue_id=test_queue.id,
        assignee_id=test_user.id,
        assigner_id=test_user.id,
    )
    db_session.add(ticket)
    db_session.flush()
    return ticket


class TestListComments:
    def test_list_ordered_by_created_at(self, client, db_session, test_user, test_ticket):
        c1 = Comment(ticket_id=test_ticket.id, user_id=test_user.id, content="First")
        c2 = Comment(ticket_id=test_ticket.id, user_id=test_user.id, content="Second")
        db_session.add(c1)
        db_session.add(c2)
        db_session.flush()

        resp = client.get(f"/api/tickets/{test_ticket.id}/comments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["content"] == "First"
        assert data[1]["content"] == "Second"


class TestCreateComment:
    def test_create_success(self, client, test_ticket):
        resp = client.post(
            f"/api/tickets/{test_ticket.id}/comments",
            json={"content": "Hello world"},
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == "Hello world"


class TestUpdateComment:
    def test_edit_own_comment(self, client, db_session, test_user, test_ticket):
        comment = Comment(
            ticket_id=test_ticket.id, user_id=test_user.id, content="Original"
        )
        db_session.add(comment)
        db_session.flush()

        resp = client.patch(
            f"/api/tickets/{test_ticket.id}/comments/{comment.id}",
            json={"content": "Edited"},
        )
        assert resp.status_code == 200
        assert resp.json()["content"] == "Edited"
        assert resp.json()["updated_at"] is not None

    def test_edit_others_denied(
        self, client, auth_as, db_session, test_user, member_user, test_ticket
    ):
        comment = Comment(
            ticket_id=test_ticket.id, user_id=test_user.id, content="Not yours"
        )
        db_session.add(comment)
        db_session.flush()

        auth_as(member_user)
        resp = client.patch(
            f"/api/tickets/{test_ticket.id}/comments/{comment.id}",
            json={"content": "Hacked"},
        )
        assert resp.status_code == 403


class TestDeleteComment:
    def test_delete_own(self, client, db_session, test_user, test_ticket):
        comment = Comment(
            ticket_id=test_ticket.id, user_id=test_user.id, content="Delete me"
        )
        db_session.add(comment)
        db_session.flush()

        resp = client.delete(
            f"/api/tickets/{test_ticket.id}/comments/{comment.id}"
        )
        assert resp.status_code == 204

    def test_delete_others_denied(
        self, client, auth_as, db_session, test_user, member_user, test_ticket
    ):
        comment = Comment(
            ticket_id=test_ticket.id, user_id=test_user.id, content="Not deletable"
        )
        db_session.add(comment)
        db_session.flush()

        auth_as(member_user)
        resp = client.delete(
            f"/api/tickets/{test_ticket.id}/comments/{comment.id}"
        )
        assert resp.status_code == 403
