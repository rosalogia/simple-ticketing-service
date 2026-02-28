---
type: invariant
status: active
applies_to:
  - "[[backend]]"
established_by: "[[003-ticket-event-history]]"
---

## Statement
Every significant ticket lifecycle change (status, priority, assignee, due date, escalation, page, acknowledgment) MUST record a `TicketEvent` row via the `_record_event()` helper in `app/routers/tickets.py`. The performance dashboard depends on this data for computing time-to-close, time-to-start, escalation rates, and due date compliance metrics.

## Rationale
If events are not recorded, the performance dashboard (`/api/queues/{id}/performance/{userId}`) silently returns incorrect metrics. There is no runtime error — just wrong numbers. This makes the invariant easy to violate accidentally when adding new ticket actions.

## Verification
- Backend tests in `tests/routers/test_performance.py` verify that creating tickets, changing status, changing priority, and changing assignees all produce the expected `TicketEvent` rows.
- Manual check: after any ticket state change, query `SELECT * FROM ticket_events WHERE ticket_id = ?` and confirm the event exists.

## Risks
- Adding a new endpoint or action that modifies ticket state without calling `_record_event()`.
- Refactoring the ticket router in a way that moves logic before the event recording call, or removes it.
- Bulk operations that bypass the router (e.g., direct SQL, scheduler jobs) won't record events unless explicitly instrumented.
