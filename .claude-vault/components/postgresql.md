---
type: component
name: postgresql
health: stable
dependencies: []
dependents:
  - "[[backend]]"
---

## Summary
PostgreSQL 16 database. Single source of persistence for all STS data. Managed by Railway in production, Nix flake in development. Schema managed by Alembic migrations.

## Interfaces
- Connected via `DATABASE_URL` environment variable.
- Accessed through SQLAlchemy ORM in the backend.
- Test databases: `sts_test` (pytest), `sts_e2e` (Playwright).

## Health
Stable. 11 Alembic migrations establishing the full schema.

## Limitations
- Single instance (Railway managed). No read replicas.

## Caution Areas
- Alembic migrations auto-run at startup — destructive schema changes need careful rollout.
- Cascade deletes configured on queue → tickets, queue → members, etc.

## Customer Impact
Total data loss or unavailability means complete service outage.
