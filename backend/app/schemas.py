from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import QueueRole, TicketPriority, TicketStatus


# ── API Keys ──────────────────────────────────────────────────────────


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: int
    key_prefix: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreateResponse(ApiKeyResponse):
    key: str


# ── Users ──────────────────────────────────────────────────────────────


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    is_bot: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user: UserResponse | None = None
    dev_mode: bool = False
    discord_client_id: str | None = None


# ── Queues ─────────────────────────────────────────────────────────────


class QueueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class QueueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    member_max_severity: Optional[TicketPriority] = None


class QueueMemberResponse(BaseModel):
    id: int
    user: UserResponse
    role: QueueRole
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    icon_url: str | None = None
    discord_guild_id: str | None = None
    member_max_severity: TicketPriority
    member_count: int = 0
    my_role: QueueRole | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AddMemberRequest(BaseModel):
    user_id: int
    role: QueueRole = QueueRole.MEMBER


class InviteMemberRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    role: QueueRole = QueueRole.MEMBER


class QueueInviteResponse(BaseModel):
    id: int
    queue: QueueResponse
    role: QueueRole
    invited_by: UserResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateMemberRequest(BaseModel):
    role: QueueRole


class DiscordServerInfo(BaseModel):
    guild_id: str
    name: str
    icon_url: str | None = None
    member_count: int | None = None
    bot_present: bool = False


# ── Tickets ────────────────────────────────────────────────────────────


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    assignee_id: int
    queue_id: int
    priority: TicketPriority = TicketPriority.SEV3
    due_date: Optional[date] = None
    category: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=100)
    item: Optional[str] = Field(None, max_length=100)
    on_behalf_of: Optional[int] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    assignee_id: Optional[int] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    due_date: Optional[date] = None
    category: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(None, max_length=100)
    item: Optional[str] = Field(None, max_length=100)


class TicketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    priority: TicketPriority
    status: TicketStatus
    queue_id: int
    assignee: UserResponse
    assigner: UserResponse
    on_behalf_of: UserResponse | None = None
    due_date: Optional[date]
    category: Optional[str]
    type: Optional[str]
    item: Optional[str]
    created_at: datetime
    updated_at: datetime
    comment_count: int = 0
    next_escalation_at: Optional[datetime] = None
    next_page_at: Optional[datetime] = None
    escalation_paused: bool = False
    page_acknowledged: bool = False

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    tickets: list[TicketResponse]
    total: int


# ── Comments ───────────────────────────────────────────────────────────


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    on_behalf_of: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    user: UserResponse
    on_behalf_of: UserResponse | None = None
    content: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# ── Stats & Categories ────────────────────────────────────────────────


class TicketStats(BaseModel):
    open_count: int
    in_progress_count: int
    blocked_count: int
    completed_count: int
    overdue_count: int
    total: int


class CategoriesResponse(BaseModel):
    categories: list[str]
    types: list[str]
    items: list[str]


# ── Notifications ────────────────────────────────────────────────────


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    body: str
    ticket_id: int | None = None
    read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Device Tokens ─────────────────────────────────────────────────────


class DeviceTokenCreate(BaseModel):
    token: str = Field(..., min_length=1, max_length=500)
    platform: str = Field(..., pattern="^(android|ios)$")


# ── User Queue Settings ──────────────────────────────────────────────


class UserQueueSettingsUpdate(BaseModel):
    schedule: Optional[dict] = None
    timezone: Optional[str] = Field(None, max_length=50)
    sev1_off_hours_opt_out: Optional[bool] = None


class UserQueueSettingsResponse(BaseModel):
    id: int
    user_id: int
    queue_id: int
    schedule: dict
    timezone: str
    sev1_off_hours_opt_out: bool

    model_config = ConfigDict(from_attributes=True)
