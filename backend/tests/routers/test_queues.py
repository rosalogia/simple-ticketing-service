"""Tests for queue CRUD and member management."""

from __future__ import annotations

import pytest

from app.models import QueueMember, QueueRole


class TestListQueues:
    def test_returns_only_member_queues(self, client, auth_as, other_user):
        auth_as(other_user)
        resp = client.get("/api/queues/")
        assert resp.status_code == 200
        assert resp.json() == []


class TestCreateQueue:
    def test_create_makes_creator_owner(self, client):
        resp = client.post(
            "/api/queues/", json={"name": "New Queue", "description": "desc"}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Queue"
        assert data["my_role"] == "OWNER"
        assert data["member_count"] == 1


class TestGetQueue:
    def test_includes_my_role(self, client, test_queue):
        resp = client.get(f"/api/queues/{test_queue.id}")
        assert resp.status_code == 200
        assert resp.json()["my_role"] == "OWNER"

    def test_non_member_denied(self, client, auth_as, other_user, test_queue):
        auth_as(other_user)
        resp = client.get(f"/api/queues/{test_queue.id}")
        assert resp.status_code == 403


class TestUpdateQueue:
    def test_owner_can_update(self, client, test_queue):
        resp = client.patch(
            f"/api/queues/{test_queue.id}", json={"name": "Updated"}
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    def test_member_cannot_update(self, client, auth_as, member_user, test_queue):
        auth_as(member_user)
        resp = client.patch(
            f"/api/queues/{test_queue.id}", json={"name": "Nope"}
        )
        assert resp.status_code == 403


class TestDeleteQueue:
    def test_owner_can_delete(self, client, db_session, test_user):
        from app.models import Queue

        queue = Queue(name="Delete me", created_by=test_user.id)
        db_session.add(queue)
        db_session.flush()
        db_session.add(
            QueueMember(queue_id=queue.id, user_id=test_user.id, role=QueueRole.OWNER)
        )
        db_session.flush()

        resp = client.delete(f"/api/queues/{queue.id}")
        assert resp.status_code == 204

    def test_member_cannot_delete(self, client, auth_as, member_user, test_queue):
        auth_as(member_user)
        resp = client.delete(f"/api/queues/{test_queue.id}")
        assert resp.status_code == 403


class TestMembers:
    def test_add_member(self, client, other_user, test_queue):
        resp = client.post(
            f"/api/queues/{test_queue.id}/members",
            json={"user_id": other_user.id, "role": "MEMBER"},
        )
        assert resp.status_code == 201
        assert resp.json()["role"] == "MEMBER"

    def test_duplicate_add_fails(self, client, member_user, test_queue):
        resp = client.post(
            f"/api/queues/{test_queue.id}/members",
            json={"user_id": member_user.id, "role": "MEMBER"},
        )
        assert resp.status_code == 409

    def test_update_member_role(self, client, member_user, test_queue):
        resp = client.patch(
            f"/api/queues/{test_queue.id}/members/{member_user.id}",
            json={"role": "VIEWER"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "VIEWER"

    def test_remove_member(self, client, db_session, test_user, test_queue, other_user):
        db_session.add(
            QueueMember(queue_id=test_queue.id, user_id=other_user.id, role=QueueRole.MEMBER)
        )
        db_session.flush()

        resp = client.delete(
            f"/api/queues/{test_queue.id}/members/{other_user.id}"
        )
        assert resp.status_code == 204

    def test_self_leave(self, client, auth_as, member_user, test_queue):
        auth_as(member_user)
        resp = client.delete(
            f"/api/queues/{test_queue.id}/members/{member_user.id}"
        )
        assert resp.status_code == 204
