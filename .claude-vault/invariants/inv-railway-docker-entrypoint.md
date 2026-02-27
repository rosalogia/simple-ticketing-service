---
type: invariant
status: active
applies_to:
  - "[[prometheus]]"
  - "[[grafana]]"
established_by: "[[002-observability-stack]]"
---

## Statement
When deploying third-party Docker images to Railway that need `$PORT` expansion at runtime, the Dockerfile must clear the base image's `ENTRYPOINT` with `ENTRYPOINT []` before using a shell `CMD`. Without this, the shell command (`sh`, `-c`, ...) is passed as arguments to the base image's entrypoint binary instead of being executed as a command.

## Rationale
Railway assigns `$PORT` dynamically at runtime. Many base images (e.g., `prom/prometheus`, `grafana/grafana`) set an `ENTRYPOINT` that intercepts `CMD` arguments. A `CMD ["sh", "-c", "...${PORT}..."]` without clearing the entrypoint results in the base binary receiving `sh` as an unexpected argument, causing crashes or the service listening on the wrong port.

Railway's `${{PORT}}` reference variable syntax also does NOT work for the built-in `PORT` env var in the Railway dashboard — it only works for cross-service references.

## Pattern
```dockerfile
FROM some-base-image:latest
# ... COPY files ...
ENTRYPOINT []
CMD ["sh", "-c", "RELEVANT_PORT_VAR=${PORT:-default} /path/to/entrypoint"]
```

## Verification
- `monitoring/prometheus/Dockerfile` has `ENTRYPOINT []` before `CMD`.
- `monitoring/grafana/Dockerfile` has `ENTRYPOINT []` before `CMD`.
- Both services start successfully on Railway and listen on the assigned port.

## Risks
- Forgetting `ENTRYPOINT []` when adding a new third-party service to Railway.
- Base image updates changing the entrypoint path (e.g., `/run.sh` moves to `/entrypoint.sh`).
