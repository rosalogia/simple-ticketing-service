FROM prom/prometheus:latest

COPY prometheus.yml /etc/prometheus/prometheus.yml

# Prometheus has no public domain — use a fixed port so Grafana's
# datasource config doesn't break when Railway reassigns $PORT.
ENTRYPOINT []
CMD ["/bin/prometheus", \
  "--config.file=/etc/prometheus/prometheus.yml", \
  "--storage.tsdb.path=/prometheus", \
  "--storage.tsdb.retention.time=30d", \
  "--web.listen-address=0.0.0.0:9090"]
