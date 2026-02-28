---
type: incident
severity: sev3
status: resolved
affected_components:
  - "[[prometheus]]"
  - "[[grafana]]"
  - "[[backend]]"
symptoms:
  - "Prometheus scraping /metrics got 404"
  - "Grafana dashboards show 'Datasource prometheus was not found'"
  - "Prometheus service removed by Railway after hardcoding port"
root_cause: Multiple configuration mismatches during initial observability stack deployment
duration_minutes: ~
---

## Detection
Discovered during the initial deployment and verification of the observability stack (Prometheus + Grafana) on Railway. Three separate issues surfaced in sequence.

## Symptoms
1. **Prometheus service removed** — After PR #34 hardcoded port 9090 in the Dockerfile (ignoring `$PORT`), Railway removed the Prometheus service entirely because it was not listening on the assigned `$PORT`.
2. **Prometheus scraping got 404** — After fixing the port issue, Prometheus could reach the backend but got 404 responses when scraping `/metrics`. No metrics data was collected.
3. **Grafana "Datasource prometheus was not found"** — Even after Prometheus started scraping successfully, Grafana dashboard panels all showed errors because the datasource could not be found.

## Investigation

### Issue 1: Prometheus service removed (PR #34)
- Attempted to hardcode port 9090 in the Prometheus Dockerfile, ignoring the `$PORT` environment variable.
- Railway requires all services to listen on `$PORT` for health checking, even services without a public domain.
- Railway removed the service when it detected it was not listening on `$PORT`.

### Issue 2: /metrics 404 (PR #35)
- The backend's `/metrics` endpoint checks the `Host` header to ensure requests come from the Railway private network (must end in `.railway.internal`).
- Prometheus sends `Host: backend.railway.internal:8000` (with port) when scraping over the private network.
- The Host header check was doing a simple suffix match against `.railway.internal`, which failed because the header value ended in `:8000`, not `.railway.internal`.

### Issue 3: Grafana datasource not found (PR #36)
- Dashboard JSON referenced datasource `"uid": "prometheus"`.
- The provisioned datasource YAML at `monitoring/grafana/provisioning/datasources/prometheus.yml` did not set a `uid` field.
- Grafana auto-generated a random UID for the datasource, which did not match `"prometheus"`.
- All dashboard panels failed to resolve the datasource reference.

## Root Cause
Three independent configuration issues, all stemming from Railway-specific behaviors and Grafana provisioning semantics that were not initially accounted for:

1. Railway enforces `$PORT` listening even for private-network-only services.
2. Railway private network Host headers include the port number.
3. Grafana provisioned datasource UIDs must be explicitly set to match dashboard references.

## Resolution
1. **PR #34 fix**: Removed the hardcoded port. Pinned `PORT=9090` as a service variable in the Railway dashboard instead, so `$PORT` evaluates to `9090` at runtime.
2. **PR #35**: Updated the `/metrics` Host header check to strip the port before comparing against `.railway.internal`.
3. **PR #36**: Added `uid: prometheus` to the datasource provisioning YAML.

## Prevention
Three new invariants were created to prevent recurrence:
- [[inv-railway-port-required]] — Services must listen on `$PORT`; pin it via Railway dashboard for stable ports.
- [[inv-metrics-private-only]] — Updated to document the port-stripping requirement for Host header checks.
- [[inv-grafana-datasource-uid]] — Provisioned datasource YAML must set explicit `uid` matching dashboard JSON.

Component docs updated: [[prometheus]], [[grafana]], [[backend]].
Decision record updated: [[002-observability-stack]].
