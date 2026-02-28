---
type: component
name: prometheus
health: stable
dependencies:
  - "[[backend]]"
dependents:
  - "[[grafana]]"
---

## Summary
Self-hosted Prometheus instance on Railway. Scrapes the backend's `/metrics` endpoint over the private network every 30 seconds. Stores time-series data with 30-day retention. No public domain — only accessible internally.

## Interfaces
- Scrapes `backend.railway.internal:8000/metrics` (private network)
- Queried by Grafana at `prometheus.railway.internal:<PORT>` (private network)
- Config: `monitoring/prometheus/prometheus.yml`
- Dockerfile: `monitoring/prometheus/Dockerfile`

## Health
Deployed on Railway. Service points at `monitoring/prometheus/` subdirectory on GitHub. See [[002-observability-stack]].

## Limitations
- Single instance, no HA. Acceptable for current scale.
- 30-day retention — older data is dropped. Increase via `--storage.tsdb.retention.time` if needed.
- Railway assigns `$PORT` dynamically; Dockerfile handles this via shell CMD.

## Caution Areas
- `prometheus.yml` scrape target is hardcoded to `backend.railway.internal:8000`. If the backend service name or port changes, update this.
- No authentication on the Prometheus HTTP API — relies entirely on Railway private networking for access control.
- The `prom/prometheus` base image has `ENTRYPOINT ["/bin/prometheus"]`. The Dockerfile must clear it with `ENTRYPOINT []` before using a shell `CMD` for `$PORT` expansion. See [[inv-railway-docker-entrypoint]].
- **PORT must be pinned as a Railway service variable** (e.g., `PORT=9090`). Do NOT try to hardcode the port in the Dockerfile while ignoring `$PORT` — Railway will REMOVE the service if it doesn't listen on `$PORT`. Instead, pin `PORT=9090` in the Railway dashboard so `$PORT` is always 9090. This gives Grafana a stable address (`prometheus.railway.internal:9090`). See [[inv-railway-port-required]].
- When Prometheus sends `Host` header to scrape targets, it includes the port (e.g., `backend.railway.internal:8000`). The backend's `/metrics` Host check must handle this. See [[inv-metrics-private-only]].

## Customer Impact
None directly. Prometheus is internal infrastructure. If it goes down, Grafana dashboards stop updating but no user-facing features are affected.
