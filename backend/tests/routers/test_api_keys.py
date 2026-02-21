"""Tests for API key CRUD."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import pytest

from app.models import ApiKey


class TestCreateApiKey:
    def test_returns_raw_key_with_prefix(self, client):
        resp = client.post("/api/api-keys/", json={"name": "My Key"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["key"].startswith("sts_")
        assert data["name"] == "My Key"
        assert data["key_prefix"] == data["key"][:8]

    def test_created_key_is_unique(self, client):
        r1 = client.post("/api/api-keys/", json={"name": "Key 1"})
        r2 = client.post("/api/api-keys/", json={"name": "Key 2"})
        assert r1.json()["key"] != r2.json()["key"]


class TestListApiKeys:
    def test_list_shows_own_only(self, client, db_session, test_user, other_user):
        db_session.add(
            ApiKey(
                key_hash="hash1",
                key_prefix="sts_abcd",
                name="Mine",
                user_id=test_user.id,
            )
        )
        db_session.add(
            ApiKey(
                key_hash="hash2",
                key_prefix="sts_efgh",
                name="Theirs",
                user_id=other_user.id,
            )
        )
        db_session.flush()

        resp = client.get("/api/api-keys/")
        assert resp.status_code == 200
        data = resp.json()
        assert all(k["name"] != "Theirs" for k in data)


class TestRevokeApiKey:
    def test_revoke_sets_revoked_at(self, client, db_session, test_user):
        key = ApiKey(
            key_hash="revoke_hash",
            key_prefix="sts_revo",
            name="Revoke me",
            user_id=test_user.id,
        )
        db_session.add(key)
        db_session.flush()

        resp = client.delete(f"/api/api-keys/{key.id}")
        assert resp.status_code == 204

        db_session.refresh(key)
        assert key.revoked_at is not None

    def test_revoke_already_revoked_fails(self, client, db_session, test_user):
        key = ApiKey(
            key_hash="already_revoked",
            key_prefix="sts_alre",
            name="Already Revoked",
            user_id=test_user.id,
            revoked_at=datetime.now(timezone.utc),
        )
        db_session.add(key)
        db_session.flush()

        resp = client.delete(f"/api/api-keys/{key.id}")
        assert resp.status_code == 400
