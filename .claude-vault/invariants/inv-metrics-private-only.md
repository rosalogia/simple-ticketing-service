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

**The Host header check must strip the port before comparing.** Railway private network requests include the port in the Host header (e.g., `backend.railway.internal:8000`), so a naive suffix check against `.railway.internal` will fail. The code must parse/strip the port first.

## Rationale
Prometheus metrics expose internal operational details (route patterns, error rates, DB pool state, scheduler job counts). Publicly exposing them leaks infrastructure information and could aid reconnaissance. Prometheus scrapes over the private network so there is no need for public access.

## Verification
- `backend/app/main.py` `/metrics` handler checks `Host` header against `.railway.internal` suffix, stripping port first.
- `backend/tests/routers/test_health.py` includes `test_metrics_blocked_from_public` asserting 404 for non-internal hosts.
- Test should also verify that hosts with port (e.g., `backend.railway.internal:8000`) are accepted.
- `curl <backend-public-url>/metrics` should return 404 in production.

## Risks
- Someone removing the check "for convenience" during debugging and forgetting to restore it.
- A reverse proxy or load balancer rewriting the `Host` header to an internal hostname, inadvertently bypassing the check.
- Regressing the port-stripping logic — this already caused a production incident where Prometheus got 404s scraping `/metrics`. See [[inc-003-observability-deployment-debugging]].
