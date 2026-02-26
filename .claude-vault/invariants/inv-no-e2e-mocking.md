---
type: invariant
status: active
applies_to:
  - "[[frontend]]"
  - "[[backend]]"
established_by: "[[001-naming-convention]]"
---

## Statement
E2E tests must never mock backend services. They exercise the real stack end-to-end: real frontend → real backend → real PostgreSQL.

## Rationale
Mocking in E2E tests defeats the purpose of end-to-end testing. Real integration issues (auth flows, database constraints, API contract mismatches) are only caught when the full stack runs together.

## Verification
- Check `frontend/e2e/` test files — no `mock`, `stub`, or `intercept` calls on network requests.
- `playwright.config.ts` starts real backend and frontend servers.

## Risks
- Slow or flaky tests may tempt mocking. Address with better test infrastructure, not mocking.
