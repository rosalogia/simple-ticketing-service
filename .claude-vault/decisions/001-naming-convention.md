---
type: decision
domain: vault
status: active
triggers:
  - If vault grows beyond 50 notes and naming collisions appear
---

## Context
Initializing the structured agent memory vault for STS. Need a consistent naming convention for all vault notes.

## Decision
- **Decisions**: `NNN-short-description.md` (zero-padded 3-digit sequential number)
- **Components**: `component-name.md` (matching the canonical system name)
- **Invariants**: `inv-short-description.md`
- **Narratives**: `domain-area.md`
- **Incidents**: `inc-NNN-short-description.md`
- **Baselines**: `component-name.md` (same as component, lives in baselines/)
- **Runbooks**: `rb-trigger-description.md`

All lowercase, hyphen-separated, no special characters.

## Alternatives
- Date-based prefixes (e.g., `2026-02-25-...`) — rejected; too verbose, doesn't add value when git tracks dates.
- Flat numbering across all types — rejected; type-specific prefixes aid quick identification.

## Consequences
- Makes it easy to reference notes via wikilinks without ambiguity.
- Sequential numbering for decisions and incidents gives chronological ordering.

## Trigger Conditions
Revisit if naming collisions become frequent or if the vault exceeds 50 notes.
