"""Tests for device token registration."""

from __future__ import annotations

import pytest

from app.models import DeviceToken


class TestRegisterDevice:
    def test_register_creates_token(self, client, db_session, test_user):
        resp = client.post(
            "/api/devices/token",
            json={"token": "test_device_token", "platform": "android"},
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "created"

        token = (
            db_session.query(DeviceToken)
            .filter(DeviceToken.user_id == test_user.id)
            .first()
        )
        assert token is not None
        assert token.token == "test_device_token"

    def test_reregister_upserts(self, client, db_session, test_user):
        db_session.add(
            DeviceToken(
                user_id=test_user.id, token="existing_token", platform="android"
            )
        )
        db_session.flush()

        resp = client.post(
            "/api/devices/token",
            json={"token": "existing_token", "platform": "ios"},
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "updated"


class TestUnregisterDevice:
    def test_unregister_deletes(self, client, db_session, test_user):
        db_session.add(
            DeviceToken(
                user_id=test_user.id, token="delete_me", platform="android"
            )
        )
        db_session.flush()

        resp = client.request(
            "DELETE",
            "/api/devices/token",
            json={"token": "delete_me", "platform": "android"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_unregister_nonexistent(self, client):
        resp = client.request(
            "DELETE",
            "/api/devices/token",
            json={"token": "nonexistent", "platform": "android"},
        )
        assert resp.status_code == 404
