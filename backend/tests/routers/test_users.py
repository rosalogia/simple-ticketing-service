"""Tests for user endpoints."""

from __future__ import annotations

import pytest


class TestListUsers:
    def test_list_users(self, client, test_user):
        resp = client.get("/api/users/")
        assert resp.status_code == 200
        data = resp.json()
        assert any(u["id"] == test_user.id for u in data)


class TestCreateUser:
    def test_create(self, client):
        resp = client.post(
            "/api/users/",
            json={"username": "newuser", "display_name": "New User"},
        )
        assert resp.status_code == 201
        assert resp.json()["username"] == "newuser"

    def test_duplicate_username_fails(self, client, test_user):
        resp = client.post(
            "/api/users/",
            json={"username": test_user.username, "display_name": "Dup"},
        )
        assert resp.status_code == 409


class TestUpdateMe:
    def test_update_display_name(self, client):
        resp = client.patch(
            "/api/users/me", json={"display_name": "Updated Name"}
        )
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Updated Name"


class TestGetUser:
    def test_get_by_id(self, client, test_user):
        resp = client.get(f"/api/users/{test_user.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == test_user.id

    def test_get_nonexistent(self, client):
        resp = client.get("/api/users/99999")
        assert resp.status_code == 404
