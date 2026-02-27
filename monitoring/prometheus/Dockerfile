FROM prom/prometheus:latest

COPY prometheus.yml /etc/prometheus/prometheus.yml

# Railway assigns $PORT dynamically; default to 9090 for local use
ENTRYPOINT []
CMD ["sh", "-c", \
  "/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/prometheus \
    --storage.tsdb.retention.time=30d \
    --web.listen-address=0.0.0.0:${PORT:-9090}"]
