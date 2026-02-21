"""Core test fixtures: test DB, auth overrides, client, notification mocks."""

from __future__ import annotations

from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import StaticPool, create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.auth import get_current_user_id, get_optional_user_id
from app.models import Queue, QueueMember, QueueRole, User


# ── In-memory SQLite engine ──────────────────────────────────────────


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture()
def db_session(test_engine):
    connection = test_engine.connect()
    transaction = connection.begin()
    TestSession = sessionmaker(bind=connection)
    session = TestSession()

    # Nested transaction so each test rolls back
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        nonlocal nested
        if transaction.nested and not transaction._parent.nested:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ── Pre-seeded users & queue ─────────────────────────────────────────


@pytest.fixture()
def test_user(db_session):
    user = User(username="testuser", display_name="Test User")
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def other_user(db_session):
    user = User(username="otheruser", display_name="Other User")
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def member_user(db_session):
    user = User(username="memberuser", display_name="Member User")
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def viewer_user(db_session):
    user = User(username="vieweruser", display_name="Viewer User")
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def test_queue(db_session, test_user, member_user, viewer_user):
    queue = Queue(name="Test Queue", description="A test queue", created_by=test_user.id)
    db_session.add(queue)
    db_session.flush()

    # test_user is OWNER
    db_session.add(
        QueueMember(queue_id=queue.id, user_id=test_user.id, role=QueueRole.OWNER)
    )
    # member_user is MEMBER
    db_session.add(
        QueueMember(queue_id=queue.id, user_id=member_user.id, role=QueueRole.MEMBER)
    )
    # viewer_user is VIEWER
    db_session.add(
        QueueMember(queue_id=queue.id, user_id=viewer_user.id, role=QueueRole.VIEWER)
    )
    db_session.flush()
    return queue


# ── Starlette TestClient ─────────────────────────────────────────────


@pytest.fixture()
def client(db_session, test_user):
    """Sync test client with auth override and DB override."""
    from starlette.testclient import TestClient
    from app.main import app

    def override_get_db():
        yield db_session

    def override_auth():
        return test_user.id

    def override_optional_auth():
        return test_user.id

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_auth
    app.dependency_overrides[get_optional_user_id] = override_optional_auth

    # Provide a no-op lifespan to skip migrations/scheduler/discord
    @asynccontextmanager
    async def noop_lifespan(app):
        yield

    original_router_lifespan = app.router.lifespan_context
    app.router.lifespan_context = noop_lifespan

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.router.lifespan_context = original_router_lifespan
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_as(db_session):
    """Factory fixture to switch auth to a different user."""
    from app.main import app

    def _auth_as(user):
        app.dependency_overrides[get_current_user_id] = lambda: user.id
        app.dependency_overrides[get_optional_user_id] = lambda: user.id

    return _auth_as


# ── Global notification & scheduler mocks ────────────────────────────


@pytest.fixture(autouse=True)
def _mock_notifications():
    with (
        patch("app.notifications.send_notification"),
        patch("app.notifications.send_page"),
        patch("app.routers.tickets.notify_ticket_assigned"),
        patch("app.routers.tickets.notify_ticket_reassigned"),
        patch("app.routers.tickets.notify_status_changed"),
        patch("app.routers.tickets.trigger_page_for_ticket"),
        patch("app.routers.comments.notify_comment_added"),
    ):
        yield


@pytest.fixture(autouse=True)
def _mock_scheduler():
    with (
        patch("app.scheduler.start_scheduler"),
        patch("app.scheduler.stop_scheduler"),
    ):
        yield
