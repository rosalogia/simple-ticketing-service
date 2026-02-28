---
type: decision
domain: backend
status: active
triggers:
  - If event sourcing or CQRS is adopted, this append-only log may need to become the primary source of truth
  - If ticket lifecycle events exceed the current enum, revisit TicketEventType extensibility
---

## Context
Users needed a performance dashboard showing responsiveness and resolution metrics per user within a queue. The backend only tracked `created_at` and `updated_at` on tickets — `updated_at` changes on any edit, making it impossible to compute time-to-start, time-to-close, or track specific lifecycle transitions accurately.

## Decision
Added a general-purpose `TicketEvent` model as an append-only audit log for all significant ticket lifecycle changes. Each event records: ticket_id, event_type (enum), actor_id, old_value, new_value, and created_at. Event types cover: CREATED, STATUS_CHANGED, PRIORITY_CHANGED, ASSIGNEE_CHANGED, DUE_DATE_CHANGED, ESCALATED, PAGED, ACKNOWLEDGED.

Events are recorded inline in the existing ticket router endpoints via a `_record_event()` helper. A backfill migration creates approximate CREATED and STATUS_CHANGED events for all pre-existing tickets.

## Alternatives
- **Status-only transition table**: Simpler but wouldn't capture priority changes, reassignments, escalations, or pages — all of which are useful for performance analysis.
- **Full event sourcing**: Deriving ticket state from events would be more powerful but massively increases complexity. Current needs are met by recording events alongside normal CRUD.
- **Trigger-based recording (database triggers)**: Would decouple event logging from application code but makes testing harder and hides business logic in the database layer.

## Consequences
- **Easier**: Computing time-based metrics (time-to-close, time-to-start), building audit trails, analyzing escalation patterns, tracking assignee changes.
- **Harder**: Every new ticket lifecycle action must remember to call `_record_event()`. See [[inv-ticket-events-recorded]]. Forgetting breaks metrics silently.
- **Storage**: Event table grows linearly with ticket activity. Not a concern at current scale but may need archival at high volume.

## Trigger Conditions
- When event volume causes performance issues on the `ticket_events` table (consider partitioning or archival).
- If a new ticket lifecycle action is added that doesn't fit the current `TicketEventType` enum.
- If event sourcing is considered as a broader architectural pattern.
