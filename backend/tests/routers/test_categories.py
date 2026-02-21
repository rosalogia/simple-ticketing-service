"""Tests for categories endpoint."""

from __future__ import annotations

import pytest

from app.models import Ticket


class TestGetCategories:
    def test_returns_distinct_values(self, client, db_session, test_user, test_queue):
        db_session.add(
            Ticket(
                title="T1",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                category="Bug",
                type="Frontend",
                item="Button",
            )
        )
        db_session.add(
            Ticket(
                title="T2",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                category="Feature",
                type="Backend",
                item="API",
            )
        )
        db_session.add(
            Ticket(
                title="T3",
                queue_id=test_queue.id,
                assignee_id=test_user.id,
                assigner_id=test_user.id,
                category="Bug",  # duplicate
                type="Frontend",  # duplicate
                item="Form",
            )
        )
        db_session.flush()

        resp = client.get(f"/api/categories/?queue_id={test_queue.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert sorted(data["categories"]) == ["Bug", "Feature"]
        assert sorted(data["types"]) == ["Backend", "Frontend"]
        assert sorted(data["items"]) == ["API", "Button", "Form"]

    def test_empty_queue_returns_empty(self, client, test_queue):
        resp = client.get(f"/api/categories/?queue_id={test_queue.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["categories"] == []
        assert data["types"] == []
        assert data["items"] == []
