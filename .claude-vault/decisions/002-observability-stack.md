---
type: decision
domain: backend
status: active
triggers:
  - If Railway adds native metrics collection and Prometheus becomes redundant
  - If structured logging volume creates cost pressure on log storage
  - If Prometheus storage (30d retention) fills Railway volume
---

## Context

The STS backend had zero observability — no metrics, no structured logging, and a stub health endpoint that returned `{"status": "ok"}` without checking anything. This made it impossible to monitor service health, detect degradation, or diagnose issues in production on Railway.

## Decision

Added a three-part observability stack:

1. **Prometheus metrics** (`prometheus-client`) — exposed at `/metrics`. Covers HTTP request counts/durations, scheduler job instrumentation, FCM send outcomes, and DB connection pool gauges.
2. **Structured JSON logging** (`python-json-logger`) — replaces `logging.basicConfig` with JSON-formatted log lines. Each HTTP request logs `request_id`, `method`, `path`, `status_code`, `duration_ms`, `user_id`.
3. **Enriched health endpoint** — `/api/health` now checks DB connectivity (`SELECT 1`), scheduler running state, and FCM initialization. Returns `status: ok|degraded` with per-check breakdown and `uptime_seconds`.

New files: `app/metrics.py` (metric definitions), `app/logging_config.py` (JSON logging setup), `app/middleware.py` (HTTP instrumentation middleware).

Modified: `main.py`, `database.py`, `fcm.py`, `scheduler.py`, `auth.py`.

4. **Grafana dashboard** — `monitoring/grafana-dashboard.json` (importable) and `monitoring/grafana/dashboards/sts-backend.json` (auto-provisioned). 12 panels across 4 rows: HTTP overview (request rate, latency percentiles, 5xx error rate, per-route breakdown), scheduler jobs (run rate, duration, items processed), FCM push notifications (send rate, success/failure pie), DB connection pool (size, checked out, overflow).
5. **Private-network-only `/metrics`** — In production, `/metrics` rejects requests unless the `Host` header ends with `.railway.internal`. This ensures only internal services (Prometheus) can scrape metrics. In `DEBUG=true` mode, the restriction is bypassed for local development.
6. **Self-hosted Prometheus + Grafana on Railway** — Dockerfiles in `monitoring/prometheus/` and `monitoring/grafana/`. Prometheus scrapes `backend.railway.internal:8000/metrics` every 30s with 30d retention. Grafana auto-provisions the Prometheus data source and the STS dashboard. Both communicate over Railway's private network (IPv6, `fd12::` prefix). Only Grafana gets a public domain. Prometheus port is pinned via `PORT=9090` service variable in Railway dashboard (do NOT hardcode in Dockerfile — see [[inv-railway-port-required]]). Grafana datasource provisioning YAML must set `uid: prometheus` to match dashboard JSON references (see [[inv-grafana-datasource-uid]]). See [[prometheus]] and [[grafana]].

## Alternatives

- **OpenTelemetry** — More comprehensive but significantly heavier. Prometheus is simpler for Railway's use case and has direct Grafana integration. Can migrate later.
- **Sentry for structured logging** — Good for errors but doesn't replace request-level structured logs.
- **Datadog/New Relic agents** — Third-party cost, overkill for current scale.

## Consequences

- **Easier**: Monitoring service health, diagnosing request latency, tracking FCM delivery rates, detecting scheduler failures.
- **Harder**: Log output is now JSON (less human-readable in raw terminal). `CONTENT_TYPE_LATEST` on `/metrics` isn't JSON.
- **Dependencies added**: `prometheus-client>=0.21.0`, `python-json-logger>=2.0.7`.

## Trigger Conditions

Revisit if Railway adds native APM/metrics that make the Prometheus endpoint redundant, or if log volume becomes a cost concern (consider log level filtering). Revisit Grafana hosting choice once Prometheus + Grafana are deployed (self-hosted on Railway vs Grafana Cloud free tier).
