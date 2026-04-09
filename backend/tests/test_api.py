from fastapi.testclient import TestClient

from app.main import app
from app.models.graph import GraphPayload, GraphQueryMeta, GraphQueryResponse, GraphStats
from app.services.neo4j_graph import get_graph_service


class FakeGraphService:
    def __init__(self) -> None:
        self.snapshot = GraphQueryResponse(
            status="ok",
            phase="phase6_voice_commands",
            source="neo4j",
            graph=GraphPayload(
                nodes=[
                    {
                        "id": "project-1",
                        "name": "Atlas initiative 1",
                        "type": "project",
                        "cluster": "Launch",
                        "priority": 0.88,
                        "signalStrength": 0.72,
                        "summary": "Tracks launch readiness.",
                        "updatedAt": "2026-04-09",
                        "connections": 2,
                        "x": 0,
                        "y": 1,
                        "z": 2,
                    }
                ],
                links=[
                    {
                        "id": "link-1",
                        "source": "project-1",
                        "target": "concept-2",
                        "weight": 0.65,
                        "kind": "reference",
                    }
                ],
                stats=GraphStats(
                    nodeCount=1,
                    linkCount=1,
                    typeCounts={"person": 0, "project": 1, "concept": 0, "document": 0},
                    seed=20260409,
                ),
            ),
            query=GraphQueryMeta(
                mode="snapshot",
                command="show all",
                summary="Loaded the default graph.",
                cypher="MATCH (n)",
            ),
        )

    def get_snapshot(self) -> GraphQueryResponse:
        return self.snapshot

    def run_command(
        self,
        command: str,
        visible_node_ids: list[str] | None = None,
        selected_node_ids: list[str] | None = None,
    ) -> GraphQueryResponse:
        return self.snapshot.model_copy(
            update={
                "query": GraphQueryMeta(
                    mode="search",
                    command=command,
                    summary="Query executed.",
                    cypher="MATCH (n) WHERE toLower(n.name) CONTAINS $search",
                )
            }
        )


app.dependency_overrides[get_graph_service] = FakeGraphService
client = TestClient(app)


def test_health_endpoint_reports_phase6_ready() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["phase"] == "phase6_voice_commands"
    assert "services" in payload


def test_public_config_is_browser_safe() -> None:
    response = client.get("/api/config/public")

    assert response.status_code == 200
    payload = response.json()
    assert payload["language"] == "en"
    assert payload["wsPath"] == "/ws"
    assert payload["phase"] == "phase6_voice_commands"


def test_graph_snapshot_returns_phase6_payload() -> None:
    response = client.get("/api/graph/snapshot")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["graph"]["stats"]["nodeCount"] == 1
    assert payload["query"]["mode"] == "snapshot"


def test_graph_query_executes_read_only_contract() -> None:
    response = client.post("/api/graph/query", json={"command": "show my projects"})

    assert response.status_code == 200
    assert response.json()["query"]["command"] == "show my projects"


def test_websocket_stub_returns_contract_envelope() -> None:
    with client.websocket_connect("/ws") as websocket:
        message = websocket.receive_json()

    assert message["type"] == "system_status"
    assert set(message) == {"type", "ts", "payload"}
