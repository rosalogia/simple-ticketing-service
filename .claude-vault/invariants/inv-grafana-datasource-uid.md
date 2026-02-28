---
type: invariant
status: active
applies_to:
  - "[[grafana]]"
established_by: "[[002-observability-stack]]"
---

## Statement
When provisioning Grafana datasources and dashboards via files, the datasource YAML must set an explicit `uid` field that exactly matches the `"uid"` value referenced in dashboard JSON. For the STS observability stack, the datasource YAML at `monitoring/grafana/provisioning/datasources/prometheus.yml` must include `uid: prometheus`, matching the `"uid": "prometheus"` references in `monitoring/grafana/dashboards/sts-backend.json`.

## Rationale
If the datasource YAML omits `uid`, Grafana auto-generates a random UID at startup. Dashboard JSON that references `"uid": "prometheus"` will fail to find the datasource, and all panels will show "Datasource prometheus was not found" errors. The dashboard becomes completely non-functional even though both the datasource and dashboard are provisioned correctly in every other respect.

## Verification
- `monitoring/grafana/provisioning/datasources/prometheus.yml` contains `uid: prometheus`.
- `monitoring/grafana/dashboards/sts-backend.json` references `"uid": "prometheus"` in datasource fields.
- After Grafana starts, all dashboard panels load data without "datasource not found" errors.

## Risks
- Adding a new datasource without setting `uid` and then referencing it from a dashboard.
- Changing the `uid` in the datasource YAML without updating all dashboard JSON files that reference it.
- The importable dashboard (`monitoring/grafana-dashboard.json`) uses `${datasource}` template variable instead of hardcoded UIDs — this is only relevant for the importable version, not the auto-provisioned one.

## See Also
- [[inc-003-observability-deployment-debugging]] — This was discovered during the initial observability deployment.
