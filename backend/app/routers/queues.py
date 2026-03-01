from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, selectinload

from ..ratelimit import limiter

from ..auth import get_current_session, get_current_user_id
from ..config import DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
from ..database import get_db
from ..models import (
    Queue,
    QueueMember,
    QueueRole,
    Session as SessionModel,
    User,
)

logger = logging.getLogger(__name__)
from ..schemas import (
    DiscordServerInfo,
    QueueCreate,
    QueueMemberResponse,
    QueueResponse,
    QueueUpdate,
    UpdateMemberRequest,
)

router = APIRouter()

DISCORD_API = "https://discord.com/api/v10"


def _queue_to_response(queue: Queue, user_id: int) -> QueueResponse:
    membership = next(
        (m for m in queue.members if m.user_id == user_id), None
    )
    return QueueResponse(
        id=queue.id,
        name=queue.name,
        description=queue.description,
        icon_url=queue.icon_url,
        discord_guild_id=queue.discord_guild_id,
        member_max_severity=queue.member_max_severity,
        member_count=len(queue.members),
        my_role=membership.role if membership else None,
        created_at=queue.created_at,
    )


def _require_membership(
    db: Session, queue_id: int, user_id: int
) -> QueueMember:
    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(403, "Not a member of this queue")
    return member


def _require_owner(db: Session, queue_id: int, user_id: int) -> QueueMember:
    member = _require_membership(db, queue_id, user_id)
    if member.role != QueueRole.OWNER:
        raise HTTPException(403, "Owner access required")
    return member


# ── Discord routes (before /{id} to avoid path conflicts) ─────────────


def _discord_auth_header(token: str) -> str:
    """Return the correct Authorization header value for a Discord token.

    Bot tokens follow the format `ID.timestamp.hmac` (two dots),
    while OAuth access tokens are opaque strings without dots.
    """
    if token.count(".") == 2:
        return f"Bot {token}"
    return f"Bearer {token}"


async def _refresh_discord_token(session: SessionModel, db: Session) -> bool:
    """Refresh the Discord access token if expired. Returns True if token is valid."""
    if not session.discord_refresh_token:
        return bool(session.discord_access_token)

    # Check if token is expired or about to expire (5-minute buffer)
    if session.discord_token_expires_at:
        buffer = timedelta(minutes=5)
        expires_at = session.discord_token_expires_at
        # DB may store naive datetimes — treat them as UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at - buffer > datetime.now(timezone.utc):
            return True  # Token still valid

    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        logger.warning("Cannot refresh Discord token: missing client credentials")
        return bool(session.discord_access_token)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{DISCORD_API}/oauth2/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": session.discord_refresh_token,
                    "client_id": DISCORD_CLIENT_ID,
                    "client_secret": DISCORD_CLIENT_SECRET,
                },
            )
        if resp.status_code != 200:
            logger.warning("Discord token refresh failed: %s %s", resp.status_code, resp.text)
            return False

        token_data = resp.json()
        session.discord_access_token = token_data["access_token"]
        session.discord_refresh_token = token_data.get("refresh_token", session.discord_refresh_token)
        session.discord_token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=token_data.get("expires_in", 604800)
        )
        db.commit()
        return True
    except Exception:
        logger.exception("Error refreshing Discord token")
        return False


@router.get("/discord-servers", response_model=list[DiscordServerInfo])
async def list_discord_servers(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    session: SessionModel = Depends(get_current_session),
):
    if not session.discord_access_token:
        raise HTTPException(400, "No Discord access token stored. Re-login with guilds scope.")

    # Refresh token if expired
    token_valid = await _refresh_discord_token(session, db)
    if not token_valid:
        raise HTTPException(
            401,
            "Discord token expired and refresh failed. Please log out and log back in.",
        )

    already_imported = {
        q.discord_guild_id
        for q in db.query(Queue).filter(Queue.discord_guild_id.isnot(None)).all()
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        guilds_resp = await client.get(
            f"{DISCORD_API}/users/@me/guilds",
            headers={"Authorization": _discord_auth_header(session.discord_access_token)},
        )
        if guilds_resp.status_code != 200:
            logger.warning(
                "Discord guilds API returned %s: %s",
                guilds_resp.status_code,
                guilds_resp.text[:500],
            )
            raise HTTPException(400, "Failed to fetch Discord servers. Try logging out and back in.")
        guilds = guilds_resp.json()

    result = []
    for g in guilds:
        # Only show servers where user is admin (permission bit 0x8)
        perms = int(g.get("permissions", 0))
        if not (perms & 0x8):
            continue
        guild_id = str(g["id"])
        if guild_id in already_imported:
            continue

        icon_url = None
        if g.get("icon"):
            icon_url = f"https://cdn.discordapp.com/icons/{g['id']}/{g['icon']}.png"

        bot_present = False
        if DISCORD_BOT_TOKEN:
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    resp = await client.get(
                        f"{DISCORD_API}/guilds/{guild_id}",
                        headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
                    )
                    bot_present = resp.status_code == 200
                except Exception:
                    pass

        result.append(
            DiscordServerInfo(
                guild_id=guild_id,
                name=g["name"],
                icon_url=icon_url,
                bot_present=bot_present,
            )
        )

    return result


@router.post("/from-discord", response_model=QueueResponse)
async def create_queue_from_discord(
    guild_id: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(400, "Discord bot token not configured")

    existing = db.query(Queue).filter(Queue.discord_guild_id == guild_id).first()
    if existing:
        raise HTTPException(409, "Server already imported as a queue")

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Fetch guild info
        guild_resp = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
        )
        if guild_resp.status_code != 200:
            raise HTTPException(400, "Bot cannot access this server. Is the bot invited?")
        guild_data = guild_resp.json()

        # Fetch guild members
        members_resp = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}/members?limit=1000",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
        )
        if members_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch server members")
        members_data = members_resp.json()

    icon_url = None
    if guild_data.get("icon"):
        icon_url = f"https://cdn.discordapp.com/icons/{guild_id}/{guild_data['icon']}.png"

    queue = Queue(
        name=guild_data["name"],
        description=f"Imported from Discord server: {guild_data['name']}",
        icon_url=icon_url,
        discord_guild_id=guild_id,
        created_by=current_user_id,
    )
    db.add(queue)
    db.flush()

    owner_discord_id = str(guild_data.get("owner_id", ""))
    admin_role_ids = set()
    for role in guild_data.get("roles", []):
        if int(role.get("permissions", 0)) & 0x8:
            admin_role_ids.add(str(role["id"]))

    for m in members_data:
        discord_user = m.get("user", {})
        if discord_user.get("bot"):
            continue

        discord_id = str(discord_user["id"])
        user = db.query(User).filter(User.discord_id == discord_id).first()
        if not user:
            user = User(
                username=discord_user["username"],
                display_name=discord_user.get("global_name") or discord_user["username"],
                discord_id=discord_id,
                avatar_url=(
                    f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png"
                    if discord_user.get("avatar")
                    else None
                ),
            )
            db.add(user)
            db.flush()

        is_admin = (
            discord_id == owner_discord_id
            or bool(set(m.get("roles", [])) & admin_role_ids)
        )

        queue_member = QueueMember(
            queue_id=queue.id,
            user_id=user.id,
            role=QueueRole.OWNER if is_admin else QueueRole.MEMBER,
        )
        db.add(queue_member)

    # Ensure creator is a member/owner
    creator_membership = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue.id, QueueMember.user_id == current_user_id)
        .first()
    )
    if not creator_membership:
        db.add(QueueMember(queue_id=queue.id, user_id=current_user_id, role=QueueRole.OWNER))

    db.commit()
    db.refresh(queue)

    queue = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id == queue.id)
        .first()
    )
    return _queue_to_response(queue, current_user_id)


# ── CRUD ──────────────────────────────────────────────────────────────


@router.get("/", response_model=list[QueueResponse])
def list_queues(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    memberships = (
        db.query(QueueMember)
        .filter(QueueMember.user_id == current_user_id)
        .all()
    )
    queue_ids = [m.queue_id for m in memberships]
    if not queue_ids:
        return []

    queues = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id.in_(queue_ids))
        .all()
    )
    return [_queue_to_response(q, current_user_id) for q in queues]


@router.post("/", response_model=QueueResponse, status_code=201)
@limiter.limit("10/minute")
def create_queue(
    request: Request,
    payload: QueueCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    queue = Queue(
        name=payload.name,
        description=payload.description,
        created_by=current_user_id,
    )
    db.add(queue)
    db.flush()

    owner = QueueMember(
        queue_id=queue.id, user_id=current_user_id, role=QueueRole.OWNER
    )
    db.add(owner)
    db.commit()
    db.refresh(queue)

    queue = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id == queue.id)
        .first()
    )
    return _queue_to_response(queue, current_user_id)


@router.get("/{queue_id}", response_model=QueueResponse)
def get_queue(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_membership(db, queue_id, current_user_id)
    queue = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id == queue_id)
        .first()
    )
    if not queue:
        raise HTTPException(404, "Queue not found")
    return _queue_to_response(queue, current_user_id)


@router.patch("/{queue_id}", response_model=QueueResponse)
def update_queue(
    queue_id: int,
    payload: QueueUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_owner(db, queue_id, current_user_id)
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(404, "Queue not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(queue, key, value)
    db.commit()
    db.refresh(queue)

    queue = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id == queue.id)
        .first()
    )
    return _queue_to_response(queue, current_user_id)


@router.delete("/{queue_id}", status_code=204)
def delete_queue(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_owner(db, queue_id, current_user_id)
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(404, "Queue not found")

    db.delete(queue)
    db.commit()


# ── Members ───────────────────────────────────────────────────────────


@router.get("/{queue_id}/members", response_model=list[QueueMemberResponse])
def list_members(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_membership(db, queue_id, current_user_id)
    members = (
        db.query(QueueMember)
        .options(selectinload(QueueMember.user))
        .filter(QueueMember.queue_id == queue_id)
        .order_by(QueueMember.role, QueueMember.joined_at)
        .all()
    )
    return members


@router.patch("/{queue_id}/members/{user_id}", response_model=QueueMemberResponse)
def update_member_role(
    queue_id: int,
    user_id: int,
    payload: UpdateMemberRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_owner(db, queue_id, current_user_id)

    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(404, "Member not found")

    member.role = payload.role
    db.commit()
    db.refresh(member)

    member = (
        db.query(QueueMember)
        .options(selectinload(QueueMember.user))
        .filter(QueueMember.id == member.id)
        .first()
    )
    return member


@router.delete("/{queue_id}/members/{user_id}", status_code=204)
def remove_member(
    queue_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    # Allow self-leave or owner removing others
    if user_id != current_user_id:
        _require_owner(db, queue_id, current_user_id)

    member = (
        db.query(QueueMember)
        .filter(QueueMember.queue_id == queue_id, QueueMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(404, "Member not found")

    db.delete(member)
    db.commit()


# ── Discord sync ──────────────────────────────────────────────────────


@router.post("/{queue_id}/sync-discord", response_model=QueueResponse)
async def sync_discord(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    _require_owner(db, queue_id, current_user_id)

    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue or not queue.discord_guild_id:
        raise HTTPException(400, "Queue is not linked to a Discord server")
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(400, "Discord bot token not configured")

    guild_id = queue.discord_guild_id

    async with httpx.AsyncClient(timeout=15.0) as client:
        guild_resp = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
        )
        if guild_resp.status_code != 200:
            raise HTTPException(400, "Bot cannot access this server")
        guild_data = guild_resp.json()

        members_resp = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}/members?limit=1000",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"},
        )
        if members_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch server members")
        members_data = members_resp.json()

    owner_discord_id = str(guild_data.get("owner_id", ""))
    admin_role_ids = set()
    for role in guild_data.get("roles", []):
        if int(role.get("permissions", 0)) & 0x8:
            admin_role_ids.add(str(role["id"]))

    existing_user_ids = {
        m.user_id
        for m in db.query(QueueMember).filter(QueueMember.queue_id == queue_id).all()
    }

    for m in members_data:
        discord_user = m.get("user", {})
        if discord_user.get("bot"):
            continue

        discord_id = str(discord_user["id"])
        user = db.query(User).filter(User.discord_id == discord_id).first()
        if not user:
            user = User(
                username=discord_user["username"],
                display_name=discord_user.get("global_name") or discord_user["username"],
                discord_id=discord_id,
                avatar_url=(
                    f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user['avatar']}.png"
                    if discord_user.get("avatar")
                    else None
                ),
            )
            db.add(user)
            db.flush()

        if user.id not in existing_user_ids:
            is_admin = (
                discord_id == owner_discord_id
                or bool(set(m.get("roles", [])) & admin_role_ids)
            )
            db.add(
                QueueMember(
                    queue_id=queue_id,
                    user_id=user.id,
                    role=QueueRole.OWNER if is_admin else QueueRole.MEMBER,
                )
            )

    db.commit()
    db.refresh(queue)

    queue = (
        db.query(Queue)
        .options(selectinload(Queue.members))
        .filter(Queue.id == queue.id)
        .first()
    )
    return _queue_to_response(queue, current_user_id)
