"""Tests for user queue settings endpoints."""

from __future__ import annotations

import pytest

from app.models import DEFAULT_SCHEDULE


class TestGetSettings:
    def test_get_creates_defaults(self, client, test_queue):
        resp = client.get(f"/api/queues/{test_queue.id}/my-settings")
        assert resp.status_code == 200
        data = resp.json()
        assert data["timezone"] == "America/New_York"
        assert data["sev1_off_hours_opt_out"] is False
        assert data["schedule"] == DEFAULT_SCHEDULE

    def test_non_member_denied(self, client, auth_as, other_user, test_queue):
        auth_as(other_user)
        resp = client.get(f"/api/queues/{test_queue.id}/my-settings")
        assert resp.status_code == 403


class TestUpdateSettings:
    def test_update_timezone(self, client, test_queue):
        resp = client.put(
            f"/api/queues/{test_queue.id}/my-settings",
            json={"timezone": "UTC"},
        )
        assert resp.status_code == 200
        assert resp.json()["timezone"] == "UTC"

    def test_update_sev1_opt_out(self, client, test_queue):
        resp = client.put(
            f"/api/queues/{test_queue.id}/my-settings",
            json={"sev1_off_hours_opt_out": True},
        )
        assert resp.status_code == 200
        assert resp.json()["sev1_off_hours_opt_out"] is True

    def test_update_schedule(self, client, test_queue):
        new_schedule = {
            "mon": {"start": "08:00", "end": "18:00"},
            "tue": None,
            "wed": {"start": "09:00", "end": "17:00"},
            "thu": {"start": "09:00", "end": "17:00"},
            "fri": {"start": "09:00", "end": "17:00"},
            "sat": None,
            "sun": None,
        }
        resp = client.put(
            f"/api/queues/{test_queue.id}/my-settings",
            json={"schedule": new_schedule},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["schedule"]["mon"]["start"] == "08:00"
        assert data["schedule"]["tue"] is None
