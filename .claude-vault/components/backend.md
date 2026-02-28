---
type: component
name: backend
health: stable
dependencies:
  - "[[postgresql]]"
dependents:
  - "[[frontend]]"
  - "[[mobile]]"
  - "[[discord-bot]]"
  - "[[prometheus]]"
---

## Summary
FastAPI backend serving the REST API for STS. Single source of truth for all data. Handles auth (Discord OAuth + session cookies + Bearer tokens + API keys), ticket management, queue management, notifications, paging, and escalation. Runs background scheduler jobs via APScheduler.

## Interfaces
- REST API at `/api/*` — consumed by web frontend, mobile app, and Discord bot.
- Auth: session cookies (web), Bearer tokens (mobile), API keys with SHA-256 hashing (bot).
- Dev mode: accepts `X-User-Id` header for testing without OAuth.
- FCM push notifications dispatched to mobile devices.
- Alembic migrations auto-run at startup.
- `/metrics` — Prometheus metrics endpoint (HTTP, scheduler, FCM, DB pool). Private-network only in production (rejects non-`.railway.internal` hosts). The Host header check strips the port before comparing (e.g., `backend.railway.internal:8000` -> `backend.railway.internal`) because Railway private network requests include the port in the Host header. See [[inv-metrics-private-only]], [[002-observability-stack]].
- `/api/health` — enriched health check with DB, scheduler, and FCM status + `uptime_seconds`.

## Health
Stable. Well-structured router/model/schema separation. Auth system supports multiple auth methods cleanly.

## Limitations
- Dev mode falls back to SQLite if `DATABASE_URL` not set (production uses PostgreSQL).
- Scheduler runs in-process (not distributed) — single instance only.

## Caution Areas
- `app/auth.py` — multiple auth strategies with priority ordering; changes here affect all clients.
- `app/notifications.py` — complex pageable-hours scheduling logic with timezone handling.
- `app/scheduler.py` — background jobs that modify ticket state; must handle concurrent access.
- `app/metrics.py` — single source of truth for all Prometheus collectors; avoid defining metrics elsewhere.
- Alembic migrations auto-run at startup — destructive migrations need extra care.

## Customer Impact
All user-facing features depend on the backend. If it goes down, both web and mobile are fully inoperable.
