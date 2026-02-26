---
type: component
name: discord-bot
health: stable
dependencies:
  - "[[backend]]"
dependents: []
---

## Summary
discord.py bot that enables ticket creation and management from Discord. Authenticates via API keys with bot user impersonation. Runs in the backend process.

## Interfaces
- Uses backend API via API key auth with `bot_user_id` for impersonation.
- `app/discord_bot/` — bot.py (lifecycle), cog.py (commands), views.py (UI components), helpers.py (utilities).

## Health
Stable.

## Caution Areas
- API key auth with `on_behalf_of` pattern — changes to auth system must preserve bot impersonation.
- Runs in-process with the backend — bot errors could affect API availability.

## Customer Impact
Discord users lose ability to create/manage tickets from Discord if bot is down.
