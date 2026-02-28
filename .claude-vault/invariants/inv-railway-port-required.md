---
type: invariant
status: active
applies_to:
  - "[[prometheus]]"
  - "[[grafana]]"
  - "[[backend]]"
established_by: "[[002-observability-stack]]"
---

## Statement
Every Railway service MUST listen on the port specified by the `$PORT` environment variable, even if the service has no public domain and only communicates over the private network. To get a stable, predictable port (e.g., so other services can address it at `<name>.railway.internal:<port>`), pin the port by setting `PORT=<value>` as a service variable in the Railway dashboard. Do NOT try to ignore `$PORT` or hardcode a port in the Dockerfile.

## Rationale
Railway monitors whether each service is listening on `$PORT`. If a service ignores `$PORT` and listens on a hardcoded port instead, Railway considers the service unhealthy and will REMOVE it. This happened to the Prometheus service in PR #34 when the Dockerfile was changed to hardcode port 9090 while ignoring `$PORT`. The service was removed by Railway.

The correct approach is to set `PORT=9090` as a service variable in the Railway dashboard. This makes `$PORT` evaluate to `9090` at runtime, so the Dockerfile's `CMD` (which uses `$PORT`) will listen on 9090 as desired — satisfying both Railway's health check and the need for a stable port.

## Verification
- Prometheus service in Railway dashboard has `PORT=9090` set as a service variable.
- `monitoring/prometheus/Dockerfile` CMD uses `${PORT}` (not a hardcoded port).
- `monitoring/grafana/Dockerfile` CMD uses `${PORT}` (not a hardcoded port).
- All services start successfully and remain running on Railway.

## Risks
- A developer hardcoding a port in a Dockerfile "for simplicity" instead of using `$PORT` with a pinned service variable.
- Forgetting to set the `PORT` service variable when deploying a new service that needs a stable port.
- Railway changing their health check behavior (unlikely but would affect this invariant).

## See Also
- [[inv-railway-docker-entrypoint]] — Related: Dockerfiles must also clear ENTRYPOINT for `$PORT` expansion.
- [[inc-003-observability-deployment-debugging]] — The Prometheus removal incident that established this invariant.
