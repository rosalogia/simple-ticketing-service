---
type: invariant
status: active
applies_to:
  - "[[backend]]"
  - "[[postgresql]]"
established_by: "[[001-naming-convention]]"
---

## Statement
All backend tests (unit and E2E) run against real PostgreSQL databases, never SQLite. Test databases are `sts_test` (pytest) and `sts_e2e` (Playwright).

## Rationale
PostgreSQL is used in production. SQLite has different behavior for constraints, JSON operations, and concurrent access. Testing against SQLite can mask real bugs.

## Verification
- Check `backend/tests/conftest.py` — should connect to PostgreSQL, run real Alembic migrations.
- Check `frontend/playwright.config.ts` — backend should use `sts_e2e` PostgreSQL database.
- No SQLite connection strings in test configurations.

## Risks
- Developer convenience pressure to use SQLite for faster test setup.
- CI environments might lack PostgreSQL — must always provision it.
