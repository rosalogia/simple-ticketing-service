"""Tests for auth router endpoints."""

from __future__ import annotations

from unittest.mock import patch

import pytest


class TestMe:
    def test_me_in_dev_mode(self, client, test_user):
        with patch("app.routers.auth.is_dev_mode", return_value=True):
            resp = client.get(
                "/api/auth/me", headers={"X-User-Id": str(test_user.id)}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["dev_mode"] is True
            assert data["user"]["id"] == test_user.id


class TestDevLogin:
    def test_creates_session(self, client, test_user):
        with patch("app.routers.auth.is_dev_mode", return_value=True):
            resp = client.post(
                "/api/auth/dev-login", json={"user_id": test_user.id}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "session_id" in data
            assert data["user"]["id"] == test_user.id


class TestLogout:
    def test_logout_clears_session(self, client, test_user):
        with patch("app.routers.auth.is_dev_mode", return_value=True):
            # Create session with actual test user
            resp = client.post(
                "/api/auth/dev-login", json={"user_id": test_user.id}
            )
            assert resp.status_code == 200
            # Logout reads cookie; follow_redirects=False so we get the 302
            resp = client.post("/api/auth/logout", follow_redirects=False)
            assert resp.status_code == 302
