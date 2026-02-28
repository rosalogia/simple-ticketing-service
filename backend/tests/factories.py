"""Factory Boy factories for all models."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import factory
from factory import LazyAttribute, Sequence, SubFactory

from app.models import (
    ApiKey,
    Comment,
    DeviceToken,
    EscalationTracking,
    PageTracking,
    Queue,
    QueueMember,
    QueueRole,
    Session,
    Ticket,
    TicketEvent,
    TicketEventType,
    TicketPriority,
    TicketStatus,
    User,
    UserQueueSettings,
)


class UserFactory(factory.Factory):
    class Meta:
        model = User

    username = Sequence(lambda n: f"user{n}")
    display_name = Sequence(lambda n: f"User {n}")

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        # Just build; caller adds to session
        return model_class(**kwargs)


class QueueFactory(factory.Factory):
    class Meta:
        model = Queue

    name = Sequence(lambda n: f"Queue {n}")
    description = "Test queue"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class QueueMemberFactory(factory.Factory):
    class Meta:
        model = QueueMember

    role = QueueRole.MEMBER

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class TicketFactory(factory.Factory):
    class Meta:
        model = Ticket

    title = Sequence(lambda n: f"Ticket {n}")
    priority = TicketPriority.SEV3
    status = TicketStatus.OPEN

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class CommentFactory(factory.Factory):
    class Meta:
        model = Comment

    content = Sequence(lambda n: f"Comment {n}")

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class SessionFactory(factory.Factory):
    class Meta:
        model = Session

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class ApiKeyFactory(factory.Factory):
    class Meta:
        model = ApiKey

    name = Sequence(lambda n: f"Key {n}")
    key_prefix = "sts_test"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class DeviceTokenFactory(factory.Factory):
    class Meta:
        model = DeviceToken

    token = Sequence(lambda n: f"device_token_{n}")
    platform = "android"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class UserQueueSettingsFactory(factory.Factory):
    class Meta:
        model = UserQueueSettings

    timezone = "America/New_York"
    sev1_off_hours_opt_out = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class PageTrackingFactory(factory.Factory):
    class Meta:
        model = PageTracking

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class EscalationTrackingFactory(factory.Factory):
    class Meta:
        model = EscalationTracking

    original_priority = TicketPriority.SEV4
    escalation_count = 0
    paused = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)


class TicketEventFactory(factory.Factory):
    class Meta:
        model = TicketEvent

    event_type = TicketEventType.CREATED

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        return model_class(**kwargs)
