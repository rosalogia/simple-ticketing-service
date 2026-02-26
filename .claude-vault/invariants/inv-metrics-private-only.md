---
type: invariant
status: active
applies_to:
  - "[[backend]]"
  - "[[prometheus]]"
established_by: "[[002-observability-stack]]"
---

## Statement
The `/metrics` endpoint must only be accessible over Railway's private network in production. Requests with a `Host` header that does not end in `.railway.internal` are rejected with 404. The restriction is bypassed when `DEBUG=true` for local development.

## Rationale
Prometheus metrics expose internal operational details (route patterns, error rates, DB pool state, scheduler job counts). Publicly exposing them leaks infrastructure information and could aid reconnaissance. Prometheus scrapes over the private network so there is no need for public access.

## Verification
- `backend/app/main.py` `/metrics` handler checks `Host` header against `.railway.internal` suffix.
- `backend/tests/routers/test_health.py` includes `test_metrics_blocked_from_public` asserting 404 for non-internal hosts.
- `curl <backend-public-url>/metrics` should return 404 in production.

## Risks
- Someone removing the check "for convenience" during debugging and forgetting to restore it.
- A reverse proxy or load balancer rewriting the `Host` header to an internal hostname, inadvertently bypassing the check.
