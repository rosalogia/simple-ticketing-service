"""Smoke test for health endpoint."""


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "commit" in data
