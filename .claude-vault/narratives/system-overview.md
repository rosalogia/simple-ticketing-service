---
type: narrative
domain: system
status: active
---

## Motivation
STS (Simple Ticketing Service) exists to provide a lightweight incident/ticket management system with real-time paging capabilities. It bridges Discord (where teams already communicate) with a proper ticketing UI (web and mobile). The core differentiator is the paging system — SEV1/SEV2 tickets can trigger alarm-style alerts on mobile devices, with escalation ladders and pageable-hours scheduling.

## Key Design Choices
- **Single backend, multiple clients**: One FastAPI backend serves web, mobile, and Discord bot. See [[backend]].
- **Discord as identity provider**: All auth flows through Discord OAuth. No custom user registration. See [[001-naming-convention]] for vault conventions.
- **Real PostgreSQL everywhere**: Even tests run against real PostgreSQL, never SQLite mocks. See [[inv-real-postgresql-testing]].
- **FCM for push**: Firebase Cloud Messaging delivers pages to mobile. Notifee handles Android alarm-style display.
- **In-process scheduler**: APScheduler runs paging/escalation checks inside the backend process — simple but limits horizontal scaling.

## Known Weaknesses
- Scheduler is single-instance; can't horizontally scale the backend without addressing job duplication.
- Dev mode SQLite fallback diverges from production PostgreSQL — can mask issues.
- No offline support on mobile.
- Bot runs in-process — errors could cascade to API.

## Relationship to Other Areas
The [[backend]] is the hub. [[frontend]] and [[mobile]] are independent clients. [[discord-bot]] is an in-process extension. [[postgresql]] is the single persistence layer. [[prometheus]] and [[grafana]] form the monitoring stack, communicating with the backend over Railway's private network. See [[002-observability-stack]].
