---
type: invariant
status: active
applies_to:
  - "[[mobile]]"
established_by: "feat/mobile-urgent-tickets branch, 2026-02-28"
---

## Statement
The mobile CI job must run `npx tsc --noEmit` before unit tests, just like the frontend CI runs `npx tsc -b`.

## Rationale
Without a typecheck step, TypeScript errors accumulate silently. Jest tests pass because they transpile with Babel (ignoring types). This was discovered when 7 pre-existing TS errors (FilterSheet test using `string[]` instead of `TicketStatus[]`, and `tabBarTestID` not existing in `@react-navigation/bottom-tabs` v7) went undetected for multiple PRs.

## Verification
Check `.github/workflows/ci.yml` — the `mobile` job must have a "Typecheck" step with `npx tsc --noEmit` between "Install dependencies" and "Run tests".

## Risks
- Adding new dependencies with poor type definitions could cause CI failures. Fix: add to `skipLibCheck` or fix the types.
- Pre-existing errors in test files may need fixing when this invariant is first enforced.
