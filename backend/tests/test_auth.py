"""Tests for auth function logic."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from starlette.testclient import TestClient

from app.auth import get_current_user_id, get_optional_user_id, _validate_api_key, _validate_session
from app.models import ApiKey, Session, User


class TestValidateApiKey:
    def test_valid_api_key(self, db_session, test_user):
        raw_key = "sts_test_key_12345"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = ApiKey(
            key_hash=key_hash,
            key_prefix=raw_key[:8],
            name="Test Key",
            user_id=test_user.id,
        )
        db_session.add(api_key)
        db_session.flush()

        from starlette.requests import Request
        from starlette.datastructures import Headers

        scope = {
            "type": "http",
            "headers": [(b"x-api-key", raw_key.encode())],
        }
        request = Request(scope)
        result = _validate_api_key(request, db_session)
        assert result == (test_user.id, api_key.bot_user_id)

    def test_valid_api_key_updates_last_used(self, db_session, test_user):
        raw_key = "sts_test_key_67890"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = ApiKey(
            key_hash=key_hash,
            key_prefix=raw_key[:8],
            name="Test Key",
            user_id=test_user.id,
        )
        db_session.add(api_key)
        db_session.flush()
        assert api_key.last_used_at is None

        from starlette.requests import Request

        scope = {
            "type": "http",
            "headers": [(b"x-api-key", raw_key.encode())],
        }
        request = Request(scope)
        _validate_api_key(request, db_session)
        assert api_key.last_used_at is not None

    def test_invalid_api_key(self, db_session):
        from starlette.requests import Request

        scope = {
            "type": "http",
            "headers": [(b"x-api-key", b"sts_invalid")],
        }
        request = Request(scope)
        result = _validate_api_key(request, db_session)
        assert result is None

    def test_revoked_api_key(self, db_session, test_user):
        raw_key = "sts_revoked_key"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = ApiKey(
            key_hash=key_hash,
            key_prefix=raw_key[:8],
            name="Revoked",
            user_id=test_user.id,
            revoked_at=datetime.now(timezone.utc),
        )
        db_session.add(api_key)
        db_session.flush()

        from starlette.requests import Request

        scope = {
            "type": "http",
            "headers": [(b"x-api-key", raw_key.encode())],
        }
        request = Request(scope)
        result = _validate_api_key(request, db_session)
        assert result is None

    def test_no_api_key_header(self, db_session):
        from starlette.requests import Request

        scope = {"type": "http", "headers": []}
        request = Request(scope)
        result = _validate_api_key(request, db_session)
        assert result is None


class TestValidateSession:
    def test_valid_session(self, db_session, test_user):
        session = Session(
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
        )
        db_session.add(session)
        db_session.flush()

        result = _validate_session(session.id, db_session)
        assert result is not None
        assert result.user_id == test_user.id

    def test_expired_session(self, db_session, test_user):
        session = Session(
            user_id=test_user.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db_session.add(session)
        db_session.flush()

        result = _validate_session(session.id, db_session)
        assert result is None

    def test_nonexistent_session(self, db_session):
        result = _validate_session("nonexistent_id", db_session)
        assert result is None
