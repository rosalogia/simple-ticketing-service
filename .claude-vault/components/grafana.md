---
type: component
name: grafana
health: stable
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
Deployed on Railway. Service points at `monitoring/grafana/` subdirectory on GitHub. Public domain: `sts-grafana.up.railway.app`. See [[002-observability-stack]].

## Limitations
- Single instance, no persistence volume configured — dashboard edits made in the UI are lost on redeploy. Use the provisioned JSON in the repo as source of truth.
- Admin password set via `GF_SECURITY_ADMIN_PASSWORD` env var on Railway.

## Caution Areas
- Provisioned datasource URL (`prometheus.railway.internal:9090`) assumes the Prometheus service is named `prometheus` in Railway and listens on port 9090. Prometheus port is pinned via `PORT=9090` service variable in Railway dashboard. See [[inv-railway-port-required]].
- **Provisioned datasource YAML must set an explicit `uid` that matches what dashboard JSON references.** The dashboard JSON in `monitoring/grafana/dashboards/` uses `"uid": "prometheus"` for datasource references. The provisioning YAML at `monitoring/grafana/provisioning/datasources/prometheus.yml` must include `uid: prometheus`. Without it, Grafana auto-generates a random UID and dashboards show "Datasource prometheus was not found". See [[inv-grafana-datasource-uid]].
- The importable version in `monitoring/grafana-dashboard.json` uses `${datasource}` template variable instead of hardcoded UIDs.
- The `grafana/grafana` base image has `/run.sh` as ENTRYPOINT. The Dockerfile must clear it with `ENTRYPOINT []` before using a shell `CMD` for `$PORT` expansion. Railway's `${{PORT}}` reference syntax does NOT work for the built-in `PORT` variable in env vars. See [[inv-railway-docker-entrypoint]].

## Customer Impact
None directly. Grafana is an internal operations tool. If it goes down, monitoring visibility is lost but no user-facing features are affected.
