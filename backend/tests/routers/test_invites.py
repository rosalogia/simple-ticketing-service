"""Tests for queue invitation flow."""

from __future__ import annotations

import pytest

from app.models import QueueInvite, QueueMember, QueueRole


class TestInviteMember:
    def test_owner_can_invite_by_username(self, client, other_user, test_queue):
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "MEMBER"
        assert data["queue"]["id"] == test_queue.id

    def test_invite_nonexistent_user_404(self, client, test_queue):
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": "nosuchuser", "role": "MEMBER"},
        )
        assert resp.status_code == 404

    def test_invite_existing_member_409(self, client, member_user, test_queue):
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": member_user.username, "role": "MEMBER"},
        )
        assert resp.status_code == 409
        assert "already a member" in resp.json()["detail"]

    def test_invite_already_invited_409(self, client, other_user, test_queue):
        client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        assert resp.status_code == 409
        assert "already been invited" in resp.json()["detail"]

    def test_non_owner_cannot_invite(self, client, auth_as, member_user, other_user, test_queue):
        auth_as(member_user)
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        assert resp.status_code == 403


class TestListInvites:
    def test_list_own_invites(self, client, auth_as, other_user, test_queue, test_user):
        # Create invite as owner (test_user)
        auth_as(test_user)
        client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )

        # List as invitee
        auth_as(other_user)
        resp = client.get("/api/invites")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["queue"]["id"] == test_queue.id

    def test_empty_list_for_no_invites(self, client):
        resp = client.get("/api/invites")
        assert resp.status_code == 200
        assert resp.json() == []


class TestAcceptInvite:
    def test_accept_creates_membership(self, client, auth_as, db_session, other_user, test_queue, test_user):
        # Invite as owner
        auth_as(test_user)
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "VIEWER"},
        )
        invite_id = resp.json()["id"]

        # Accept as invitee
        auth_as(other_user)
        resp = client.post(f"/api/invites/{invite_id}/accept")
        assert resp.status_code == 200

        # Verify membership created
        member = (
            db_session.query(QueueMember)
            .filter(QueueMember.queue_id == test_queue.id, QueueMember.user_id == other_user.id)
            .first()
        )
        assert member is not None
        assert member.role == QueueRole.VIEWER

        # Verify invite deleted
        invite = db_session.query(QueueInvite).filter(QueueInvite.id == invite_id).first()
        assert invite is None

    def test_cannot_accept_others_invite(self, client, auth_as, other_user, test_queue, test_user, member_user):
        # Invite other_user
        auth_as(test_user)
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        invite_id = resp.json()["id"]

        # Try to accept as member_user
        auth_as(member_user)
        resp = client.post(f"/api/invites/{invite_id}/accept")
        assert resp.status_code == 403

    def test_accept_nonexistent_invite_404(self, client):
        resp = client.post("/api/invites/99999/accept")
        assert resp.status_code == 404


class TestDeclineInvite:
    def test_decline_deletes_invite(self, client, auth_as, db_session, other_user, test_queue, test_user):
        # Invite
        auth_as(test_user)
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        invite_id = resp.json()["id"]

        # Decline
        auth_as(other_user)
        resp = client.post(f"/api/invites/{invite_id}/decline")
        assert resp.status_code == 204

        # Verify deleted
        invite = db_session.query(QueueInvite).filter(QueueInvite.id == invite_id).first()
        assert invite is None

    def test_cannot_decline_others_invite(self, client, auth_as, other_user, test_queue, test_user, member_user):
        auth_as(test_user)
        resp = client.post(
            f"/api/queues/{test_queue.id}/invites",
            json={"username": other_user.username, "role": "MEMBER"},
        )
        invite_id = resp.json()["id"]

        auth_as(member_user)
        resp = client.post(f"/api/invites/{invite_id}/decline")
        assert resp.status_code == 403
