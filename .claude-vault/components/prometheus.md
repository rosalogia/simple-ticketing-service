---
type: component
name: prometheus
health: experimental
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
Experimental — not yet deployed. Railway service needs to be created pointing at `monitoring/prometheus/` subdirectory on GitHub. See [[002-observability-stack]].

## Limitations
- Single instance, no HA. Acceptable for current scale.
- 30-day retention — older data is dropped. Increase via `--storage.tsdb.retention.time` if needed.
- Railway assigns `$PORT` dynamically; Dockerfile handles this via shell CMD.

## Caution Areas
- `prometheus.yml` scrape target is hardcoded to `backend.railway.internal:8000`. If the backend service name or port changes, update this.
- No authentication on the Prometheus HTTP API — relies entirely on Railway private networking for access control.

## Customer Impact
None directly. Prometheus is internal infrastructure. If it goes down, Grafana dashboards stop updating but no user-facing features are affected.
