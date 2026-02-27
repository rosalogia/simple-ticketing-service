"""Smoke tests for health and metrics endpoints."""

from unittest.mock import patch


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "degraded")
    assert "commit" in data
    assert "uptime_seconds" in data
    assert "checks" in data
    checks = data["checks"]
    assert "db" in checks
    assert "scheduler" in checks
    assert "fcm" in checks


def test_metrics_returns_prometheus_output(client):
    # /metrics is restricted to Railway private network; simulate internal host
    response = client.get("/metrics", headers={"host": "backend.railway.internal"})
    assert response.status_code == 200
    body = response.text
    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body


def test_metrics_allowed_with_port_in_host(client):
    # Prometheus sends Host header with port (e.g. backend.railway.internal:8000)
    response = client.get("/metrics", headers={"host": "backend.railway.internal:8000"})
    assert response.status_code == 200


def test_metrics_blocked_from_public(client):
    with patch("app.main.DEBUG", False):
        response = client.get("/metrics", headers={"host": "myapp.up.railway.app"})
    assert response.status_code == 404
