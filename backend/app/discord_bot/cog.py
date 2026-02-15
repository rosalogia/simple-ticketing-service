from __future__ import annotations

import logging
from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands
from sqlalchemy.orm import selectinload

from ..config import FRONTEND_URL
from ..database import SessionLocal
from ..models import (
    EscalationTracking,
    PageTracking,
    Queue,
    QueueMember,
    QueueRole,
    SEVERITY_NUM,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
)
from ..notifications import notify_ticket_assigned, trigger_page_for_ticket
from .helpers import parse_cti, parse_due_date, parse_severity, ticket_url
from .views import ConfirmSkipView, PaginatedTicketsView

logger = logging.getLogger(__name__)

TICKETS_PER_PAGE = 4


class STSCommands(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ── /cut ─────────────────────────────────────────────────────────

    @app_commands.command(name="cut", description="Create a new STS ticket")
    @app_commands.guild_only()
    @app_commands.describe(
        assignee="Who to assign the ticket to",
        severity="Severity level (e.g. Sev1, Sev-2, 3, s4)",
        title="Ticket title",
        due_date="Due date in MM/DD/YYYY format (optional)",
        cti="Category/Type/Item (optional)",
    )
    async def cut(
        self,
        interaction: discord.Interaction,
        assignee: discord.Member,
        severity: str,
        title: str,
        due_date: str | None = None,
        cti: str | None = None,
    ) -> None:
        await interaction.response.defer(ephemeral=True)

        db = SessionLocal()
        try:
            # 1. Resolve guild -> Queue
            guild_id = str(interaction.guild_id)
            queue = db.query(Queue).filter(Queue.discord_guild_id == guild_id).first()
            if not queue:
                await interaction.followup.send("No STS queue is linked to this server.")
                return

            # 2. Resolve invoker -> User
            invoker_discord_id = str(interaction.user.id)
            invoker_user = db.query(User).filter(User.discord_id == invoker_discord_id).first()
            if not invoker_user:
                await interaction.followup.send("Your Discord account is not linked to an STS account.")
                return

            # 3. Resolve assignee -> User
            assignee_discord_id = str(assignee.id)
            assignee_user = db.query(User).filter(User.discord_id == assignee_discord_id).first()
            if not assignee_user:
                await interaction.followup.send(f"{assignee.mention} does not have a linked STS account.")
                return

            # 4. Check invoker is queue member and not VIEWER
            invoker_member = (
                db.query(QueueMember)
                .filter(QueueMember.queue_id == queue.id, QueueMember.user_id == invoker_user.id)
                .first()
            )
            if not invoker_member:
                await interaction.followup.send("You are not a member of this queue.")
                return
            if invoker_member.role == QueueRole.VIEWER:
                await interaction.followup.send("Viewers cannot create tickets.")
                return

            # 5. Check assignee is queue member
            assignee_member = (
                db.query(QueueMember)
                .filter(QueueMember.queue_id == queue.id, QueueMember.user_id == assignee_user.id)
                .first()
            )
            if not assignee_member:
                await interaction.followup.send(f"{assignee.mention} is not a member of this queue.")
                return

            # 6. Parse severity
            priority = parse_severity(severity)
            if not priority:
                await interaction.followup.send(
                    f"Could not parse severity `{severity}`. Use Sev1-Sev4, 1-4, s1-s4, etc."
                )
                return

            # 7. Check severity permission for MEMBER role
            if invoker_member.role == QueueRole.MEMBER:
                max_sev_num = SEVERITY_NUM[queue.member_max_severity]
                ticket_sev_num = SEVERITY_NUM[priority]
                if ticket_sev_num < max_sev_num:
                    await interaction.followup.send(
                        f"Members can only create tickets with severity "
                        f"{queue.member_max_severity.value} or lower."
                    )
                    return

            # 8. Parse due_date
            parsed_due_date = None
            if due_date:
                parsed_due_date = parse_due_date(due_date)
                if parsed_due_date is None:
                    view = ConfirmSkipView("due date")
                    await interaction.followup.send(
                        f"Could not parse due date `{due_date}`. Expected MM/DD/YYYY.",
                        view=view,
                    )
                    await view.wait()
                    if not view.value:
                        return

            # 9. Parse CTI
            parsed_cti = None
            if cti:
                parsed_cti = parse_cti(cti)
                if parsed_cti is None:
                    view = ConfirmSkipView("CTI")
                    await interaction.followup.send(
                        f"Could not parse CTI `{cti}`. Expected `Category/Type/Item`.",
                        view=view,
                    )
                    await view.wait()
                    if not view.value:
                        return

            # 10. Create ticket
            ticket = Ticket(
                title=title,
                priority=priority,
                queue_id=queue.id,
                assignee_id=assignee_user.id,
                assigner_id=invoker_user.id,
                due_date=parsed_due_date,
                category=parsed_cti[0] if parsed_cti else None,
                type=parsed_cti[1] if parsed_cti else None,
                item=parsed_cti[2] if parsed_cti else None,
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)

            # 11. Page tracking for SEV1/SEV2
            if ticket.priority in (TicketPriority.SEV1, TicketPriority.SEV2):
                now = datetime.now(timezone.utc)
                pt = PageTracking(ticket_id=ticket.id, last_page_sent_at=now)
                db.add(pt)
                db.commit()
                trigger_page_for_ticket(db, ticket)

            # 12. Escalation tracking if due_date set
            if ticket.due_date:
                et = EscalationTracking(
                    ticket_id=ticket.id,
                    original_priority=ticket.priority,
                    escalation_count=0,
                    paused=False,
                )
                db.add(et)
                db.commit()

            # 13. Notify assignee
            notify_ticket_assigned(db, ticket)

            # 14. Send public embed
            link = ticket_url(FRONTEND_URL, queue.id, ticket.id)
            embed = discord.Embed(
                title=f"[{ticket.priority.value}] {ticket.title}",
                url=link,
                color=_severity_color(ticket.priority),
            )
            embed.add_field(name="Assignee", value=assignee.mention, inline=True)
            embed.add_field(name="Severity", value=ticket.priority.value, inline=True)
            if ticket.due_date:
                embed.add_field(
                    name="Due Date",
                    value=ticket.due_date.strftime("%m/%d/%Y"),
                    inline=True,
                )
            if parsed_cti:
                embed.add_field(
                    name="CTI",
                    value=f"{parsed_cti[0]}/{parsed_cti[1]}/{parsed_cti[2]}",
                    inline=True,
                )
            embed.set_footer(text=f"Ticket #{ticket.id} • {queue.name}")

            await interaction.channel.send(embed=embed)
            await interaction.followup.send("Ticket created!", ephemeral=True)

        except Exception:
            logger.exception("Error in /cut command")
            db.rollback()
            await interaction.followup.send("An error occurred while creating the ticket.")
        finally:
            db.close()

    # ── /assigned ────────────────────────────────────────────────────

    @app_commands.command(name="assigned", description="View assigned STS tickets")
    @app_commands.guild_only()
    @app_commands.describe(
        to="Whose tickets to view (default: you)",
        by="Filter by who assigned the tickets",
    )
    async def assigned(
        self,
        interaction: discord.Interaction,
        to: discord.Member | None = None,
        by: discord.Member | None = None,
    ) -> None:
        await interaction.response.defer(ephemeral=True)

        db = SessionLocal()
        try:
            # 1. Resolve guild -> Queue
            guild_id = str(interaction.guild_id)
            queue = db.query(Queue).filter(Queue.discord_guild_id == guild_id).first()
            if not queue:
                await interaction.followup.send("No STS queue is linked to this server.")
                return

            # 2. Resolve target user
            target_member = to or interaction.user
            target_discord_id = str(target_member.id)
            target_user = db.query(User).filter(User.discord_id == target_discord_id).first()
            if not target_user:
                await interaction.followup.send(
                    f"{target_member.mention} does not have a linked STS account."
                )
                return

            # 3. Build query
            q = (
                db.query(Ticket)
                .options(selectinload(Ticket.assigner))
                .filter(
                    Ticket.queue_id == queue.id,
                    Ticket.assignee_id == target_user.id,
                    Ticket.status.notin_([TicketStatus.COMPLETED, TicketStatus.CANCELLED]),
                )
                .order_by(Ticket.created_at.desc())
            )

            # 4. Filter by assigner if provided
            if by:
                by_discord_id = str(by.id)
                by_user = db.query(User).filter(User.discord_id == by_discord_id).first()
                if not by_user:
                    await interaction.followup.send(
                        f"{by.mention} does not have a linked STS account."
                    )
                    return
                q = q.filter(Ticket.assigner_id == by_user.id)

            tickets = q.all()

            if not tickets:
                await interaction.followup.send("No active tickets found.")
                return

            # 5. Build embeds (paginated if >4)
            if len(tickets) <= TICKETS_PER_PAGE:
                embed = _build_ticket_list_embed(
                    tickets, target_user, queue, 0, len(tickets)
                )
                await interaction.followup.send(embed=embed)
            else:
                embeds = []
                for i in range(0, len(tickets), TICKETS_PER_PAGE):
                    chunk = tickets[i : i + TICKETS_PER_PAGE]
                    embed = _build_ticket_list_embed(
                        chunk, target_user, queue, i, len(tickets)
                    )
                    embeds.append(embed)

                view = PaginatedTicketsView(embeds)
                await interaction.followup.send(embed=embeds[0], view=view)

        except Exception:
            logger.exception("Error in /assigned command")
            await interaction.followup.send("An error occurred while fetching tickets.")
        finally:
            db.close()


# ── Helpers ──────────────────────────────────────────────────────────


def _severity_color(priority: TicketPriority) -> int:
    return {
        TicketPriority.SEV1: 0xE74C3C,  # red
        TicketPriority.SEV2: 0xF39C12,  # orange
        TicketPriority.SEV3: 0x3498DB,  # blue
        TicketPriority.SEV4: 0x95A5A6,  # grey
    }.get(priority, 0x95A5A6)


def _build_ticket_list_embed(
    tickets: list[Ticket],
    user: User,
    queue: Queue,
    offset: int,
    total: int,
) -> discord.Embed:
    embed = discord.Embed(
        title=f"Tickets assigned to {user.display_name}",
        color=0x3498DB,
    )
    for ticket in tickets:
        link = ticket_url(FRONTEND_URL, queue.id, ticket.id)
        assigner_name = ticket.assigner.display_name if ticket.assigner else "Unknown"
        value = (
            f"**Severity:** {ticket.priority.value} | "
            f"**Status:** {ticket.status.value} | "
            f"**From:** {assigner_name}\n"
            f"[View ticket]({link})"
        )
        embed.add_field(name=f"#{ticket.id} — {ticket.title}", value=value, inline=False)

    embed.set_footer(
        text=f"{queue.name} • Showing {offset + 1}–{offset + len(tickets)} of {total}"
    )
    return embed


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(STSCommands(bot))
