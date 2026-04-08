from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_reports_scaffold_ready() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["phase"] == "phase0_scaffold"
    assert "services" in payload


def test_public_config_is_browser_safe() -> None:
    response = client.get("/api/config/public")

    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "en"
    assert payload["wsPath"] == "/ws"


def test_graph_query_contract_is_reserved() -> None:
    response = client.post("/api/graph/query", json={"command": "show my projects"})

    assert response.status_code == 501
    assert response.json()["status"] == "not_implemented"


def test_websocket_stub_returns_contract_envelope() -> None:
    with client.websocket_connect("/ws") as websocket:
        message = websocket.receive_json()

    assert message["type"] == "system_status"
    assert set(message) == {"type", "ts", "payload"}
