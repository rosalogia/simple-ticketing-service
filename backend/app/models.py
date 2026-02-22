from __future__ import annotations

import enum
import secrets
from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TicketPriority(str, enum.Enum):
    SEV1 = "SEV1"
    SEV2 = "SEV2"
    SEV3 = "SEV3"
    SEV4 = "SEV4"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class QueueRole(str, enum.Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


SEVERITY_NUM = {
    TicketPriority.SEV1: 1,
    TicketPriority.SEV2: 2,
    TicketPriority.SEV3: 3,
    TicketPriority.SEV4: 4,
}


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(8))
    name: Mapped[str] = mapped_column(String(100))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    bot_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    bot_user: Mapped[Optional[User]] = relationship(foreign_keys=[bot_user_id])


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    discord_id: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, nullable=True, index=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    assigned_tickets: Mapped[list[Ticket]] = relationship(
        foreign_keys="Ticket.assignee_id", back_populates="assignee"
    )
    created_tickets: Mapped[list[Ticket]] = relationship(
        foreign_keys="Ticket.assigner_id", back_populates="assigner"
    )
    comments: Mapped[list[Comment]] = relationship(foreign_keys="Comment.user_id", back_populates="user")
    queue_memberships: Mapped[list[QueueMember]] = relationship(back_populates="user")


class Queue(Base):
    __tablename__ = "queues"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    discord_guild_id: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, nullable=True, index=True
    )
    member_max_severity: Mapped[TicketPriority] = mapped_column(
        default=TicketPriority.SEV1
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    creator: Mapped[User] = relationship()
    members: Mapped[list[QueueMember]] = relationship(
        back_populates="queue", cascade="all, delete-orphan"
    )
    tickets: Mapped[list[Ticket]] = relationship(
        back_populates="queue", cascade="all, delete-orphan"
    )


class QueueMember(Base):
    __tablename__ = "queue_members"
    __table_args__ = (
        UniqueConstraint("queue_id", "user_id", name="uq_queue_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    queue_id: Mapped[int] = mapped_column(ForeignKey("queues.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[QueueRole] = mapped_column(default=QueueRole.MEMBER)
    joined_at: Mapped[datetime] = mapped_column(default=func.now())

    queue: Mapped[Queue] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="queue_memberships")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[TicketPriority] = mapped_column(default=TicketPriority.SEV3)
    status: Mapped[TicketStatus] = mapped_column(default=TicketStatus.OPEN)
    queue_id: Mapped[int] = mapped_column(ForeignKey("queues.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    assigner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    on_behalf_of_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    item: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), onupdate=func.now()
    )

    queue: Mapped[Queue] = relationship(back_populates="tickets")
    assignee: Mapped[User] = relationship(
        foreign_keys=[assignee_id], back_populates="assigned_tickets"
    )
    assigner: Mapped[User] = relationship(
        foreign_keys=[assigner_id], back_populates="created_tickets"
    )
    on_behalf_of: Mapped[Optional[User]] = relationship(foreign_keys=[on_behalf_of_id])
    comments: Mapped[list[Comment]] = relationship(
        back_populates="ticket", order_by="Comment.created_at",
        cascade="all, delete-orphan",
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    on_behalf_of_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(default=None)

    ticket: Mapped[Ticket] = relationship(back_populates="comments")
    user: Mapped[User] = relationship(foreign_keys=[user_id], back_populates="comments")
    on_behalf_of: Mapped[Optional[User]] = relationship(foreign_keys=[on_behalf_of_id])


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default=lambda: secrets.token_urlsafe(32)
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    discord_access_token: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    expires_at: Mapped[datetime] = mapped_column()

    user: Mapped[User] = relationship()


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    __table_args__ = (
        UniqueConstraint("user_id", "token", name="uq_user_token"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(500))
    platform: Mapped[str] = mapped_column(String(10))  # "android" or "ios"
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship()


DEFAULT_SCHEDULE = {
    "mon": {"start": "09:00", "end": "17:00"},
    "tue": {"start": "09:00", "end": "17:00"},
    "wed": {"start": "09:00", "end": "17:00"},
    "thu": {"start": "09:00", "end": "17:00"},
    "fri": {"start": "09:00", "end": "17:00"},
    "sat": {"start": "09:00", "end": "17:00"},
    "sun": {"start": "09:00", "end": "17:00"},
}


class UserQueueSettings(Base):
    __tablename__ = "user_queue_settings"
    __table_args__ = (
        UniqueConstraint("user_id", "queue_id", name="uq_user_queue_settings"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    queue_id: Mapped[int] = mapped_column(ForeignKey("queues.id", ondelete="CASCADE"), index=True)
    schedule: Mapped[dict] = mapped_column(JSON, default=DEFAULT_SCHEDULE)
    timezone: Mapped[str] = mapped_column(String(50), default="America/New_York")
    sev1_off_hours_opt_out: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship()
    queue: Mapped[Queue] = relationship()


class PageTracking(Base):
    __tablename__ = "page_tracking"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), unique=True)
    last_page_sent_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    acknowledged_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    ticket: Mapped[Ticket] = relationship()


class QueueInvite(Base):
    __tablename__ = "queue_invites"
    __table_args__ = (
        UniqueConstraint("queue_id", "user_id", name="uq_queue_invite_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    queue_id: Mapped[int] = mapped_column(ForeignKey("queues.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[QueueRole] = mapped_column(default=QueueRole.MEMBER)
    invited_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    queue: Mapped[Queue] = relationship()
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    inviter: Mapped[User] = relationship(foreign_keys=[invited_by])


class EscalationTracking(Base):
    __tablename__ = "escalation_tracking"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), unique=True)
    original_priority: Mapped[TicketPriority] = mapped_column()
    last_escalation_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    escalation_count: Mapped[int] = mapped_column(Integer, default=0)
    paused: Mapped[bool] = mapped_column(Boolean, default=False)

    ticket: Mapped[Ticket] = relationship()
