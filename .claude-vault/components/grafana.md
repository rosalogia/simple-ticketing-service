---
type: component
name: grafana
health: experimental
dependencies:
  - "[[prometheus]]"
dependents: []
---

## Summary
Self-hosted Grafana instance on Railway. Provides the monitoring dashboard for the STS backend. Auto-provisions a Prometheus data source and the STS Backend dashboard on startup. Only service in the monitoring stack with a public domain.

## Interfaces
- Public web UI (Railway-generated domain, password-protected)
- Queries `prometheus.railway.internal:<PORT>` over private network
- Provisioning config: `monitoring/grafana/provisioning/`
- Dashboard JSON: `monitoring/grafana/dashboards/sts-backend.json`
- Dockerfile: `monitoring/grafana/Dockerfile`

## Health
Experimental — not yet deployed. Railway service needs to be created pointing at `monitoring/grafana/` subdirectory on GitHub. See [[002-observability-stack]].

## Limitations
- Single instance, no persistence volume configured — dashboard edits made in the UI are lost on redeploy. Use the provisioned JSON in the repo as source of truth.
- Admin password set via `GF_SECURITY_ADMIN_PASSWORD` env var on Railway.

## Caution Areas
- Provisioned datasource URL (`prometheus.railway.internal:9090`) assumes the Prometheus service is named `prometheus` in Railway and listens on port 9090. The actual port may differ since Railway assigns `$PORT` dynamically — if Prometheus uses a different port, update `provisioning/datasources/prometheus.yml`.
- Dashboard JSON in `monitoring/grafana/dashboards/` uses hardcoded `"uid": "prometheus"` datasource references. The importable version in `monitoring/grafana-dashboard.json` uses `${datasource}` template variable instead.
- `GF_SERVER_HTTP_PORT` must be set to `${{PORT}}` in Railway env vars so Grafana listens on Railway's assigned port.

## Customer Impact
None directly. Grafana is an internal operations tool. If it goes down, monitoring visibility is lost but no user-facing features are affected.
