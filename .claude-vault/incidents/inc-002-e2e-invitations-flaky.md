---
type: incident
severity: sev3
status: resolved
affected_components:
  - "[[frontend]]"
symptoms:
  - "E2E invitations test fails with strict mode violation"
root_cause: Non-unique Playwright locators and stale data on test retry
duration_minutes: 5
---

## Detection
CI failure on PR #29 (`add-observability-stack`) — `e2e` job failed.

## Symptoms
- `invitations.spec.ts:37` — `getByText('Notifications')` resolved to 2 elements: the "Notifications" heading and the "No notifications" placeholder text.
- On retry, `invitations.spec.ts:40` — `getByText('Alice Chen invited you to E2E Test Queue')` resolved to 2 elements: the first run created a notification, the retry created a second one (DB not reset between retries).

## Investigation
1. Read CI logs — Playwright strict mode violation errors.
2. Identified two distinct issues: ambiguous locator and stale data on retry.

## Root Cause
1. `getByText('Notifications')` is ambiguous — matches both the dropdown heading and the "No notifications" message.
2. Playwright retries re-run the full test (creating queue + invitation again) without resetting the database, so notifications accumulate.

## Resolution
- Used `getByText('Notifications', { exact: true })` to match only the heading.
- Used `.first()` on the invitation locator and Accept button to tolerate duplicate notifications from retries.

Commit: `aacdb71` on branch `add-observability-stack`.

## Prevention
- Use `{ exact: true }` or role-based locators when text could be a substring of other visible text.
- Be aware that Playwright retries do not reset external state (database). Tests that create data should tolerate duplicates or use unique identifiers per attempt.
