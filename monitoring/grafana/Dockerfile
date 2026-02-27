FROM grafana/grafana:latest

COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/

# Railway injects $PORT at runtime; Grafana needs GF_SERVER_HTTP_PORT to match
CMD ["sh", "-c", "GF_SERVER_HTTP_PORT=${PORT:-3000} /run.sh"]
