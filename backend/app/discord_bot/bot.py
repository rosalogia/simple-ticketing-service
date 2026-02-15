from __future__ import annotations

import asyncio
import logging

import discord
from discord.ext import commands

from ..config import DISCORD_BOT_TOKEN

logger = logging.getLogger(__name__)

_bot: commands.Bot | None = None
_task: asyncio.Task | None = None


def create_bot() -> commands.Bot:
    intents = discord.Intents.default()
    bot = commands.Bot(command_prefix="!", intents=intents)

    @bot.event
    async def on_ready():
        synced = await bot.tree.sync()
        logger.info("Discord bot logged in as %s", bot.user)
        logger.info("Synced %d slash command(s)", len(synced))

    return bot


async def start_bot() -> None:
    global _bot, _task

    if not DISCORD_BOT_TOKEN:
        logger.warning("DISCORD_BOT_TOKEN not set, skipping Discord bot")
        return

    _bot = create_bot()
    await _bot.load_extension("app.discord_bot.cog")
    _task = asyncio.create_task(_run_bot(_bot))
    logger.info("Discord bot task created")


async def _run_bot(bot: commands.Bot) -> None:
    try:
        await bot.start(DISCORD_BOT_TOKEN)
    except asyncio.CancelledError:
        logger.info("Discord bot task cancelled")
    except Exception:
        logger.exception("Discord bot crashed")


async def stop_bot() -> None:
    global _bot, _task

    if _bot is not None:
        await _bot.close()
        logger.info("Discord bot closed")

    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass

    _bot = None
    _task = None
