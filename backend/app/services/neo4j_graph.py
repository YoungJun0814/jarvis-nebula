"""Neo4j-backed graph read service for Phase 2."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.core.config import settings
from app.graph.seed_graph import SEED_VALUE, generate_seed_graph
from app.models.graph import GraphLink, GraphPayload, GraphQueryMeta, GraphQueryResponse, GraphStats, GraphNode

if TYPE_CHECKING:  # pragma: no cover - type-only import
    from neo4j.graph import Node, Relationship


class GraphServiceError(RuntimeError):
    """Base graph service error."""


class GraphServiceUnavailable(GraphServiceError):
    """Raised when Neo4j configuration is incomplete or the server is down."""


class GraphQueryBlocked(GraphServiceError):
    """Raised when a graph command would imply a write operation."""


@dataclass(frozen=True)
class GraphIntent:
    mode: str
    command: str
    summary: str
    cypher: str
    params: dict[str, Any]


TYPE_ALIASES = {
    "person": "person",
    "people": "person",
    "project": "project",
    "projects": "project",
    "concept": "concept",
    "concepts": "concept",
    "document": "document",
    "documents": "document",
    "docs": "document",
}
CLUSTER_ALIASES = {
    "operations": "Operations",
    "research": "Research",
    "design": "Design",
    "platform": "Platform",
    "launch": "Launch",
    "roadmap": "Roadmap",
    "infrastructure": "Infrastructure",
    "client": "Client",
    "system": "System",
    "behavior": "Behavior",
    "planning": "Planning",
    "knowledge": "Knowledge",
    "archive": "Archive",
    "review": "Review",
}
WRITE_PATTERNS = {
    "create",
    "delete",
    "remove",
    "update",
    "set",
    "merge",
    "insert",
    "drop",
    "detach",
    "write",
}
STOP_WORDS = {
    "show",
    "find",
    "list",
    "all",
    "the",
    "a",
    "an",
    "me",
    "my",
    "of",
    "and",
    "for",
    "that",
    "with",
    "to",
    "from",
    "in",
    "on",
    "at",
    "around",
    "about",
    "please",
}

SNAPSHOT_CYPHER = """
MATCH (root:NebulaNode)
WITH root
ORDER BY root.priority DESC, root.name ASC
LIMIT $root_limit
RETURN collect(root.id) AS root_ids
"""

INTENT_CYPHER_TEMPLATE = """
MATCH (root:NebulaNode)
WHERE __WHERE_CLAUSE__
WITH root
ORDER BY root.priority DESC, root.name ASC
LIMIT $root_limit
RETURN collect(root.id) AS root_ids
"""


class Neo4jGraphService:
    def __init__(self) -> None:
        self._driver = None
        self._seed_checked = False

    def get_snapshot(self) -> GraphQueryResponse:
        self._ensure_seeded()
        payload = self._run_graph_query(SNAPSHOT_CYPHER, {"root_limit": 160})
        return GraphQueryResponse(
            status="ok",
            phase=settings.phase,
            source="neo4j",
            graph=payload,
            query=GraphQueryMeta(
                mode="snapshot",
                command="show all",
                summary="Loaded the default Nebula graph from Neo4j.",
                cypher=_clean_cypher(SNAPSHOT_CYPHER),
            ),
        )

    def run_command(
        self,
        command: str,
        visible_node_ids: list[str] | None = None,
        selected_node_ids: list[str] | None = None,
    ) -> GraphQueryResponse:
        self._ensure_seeded()
        intent = build_graph_intent(command, visible_node_ids or [], selected_node_ids or [])
        payload = self._run_graph_query(intent.cypher, intent.params)
        warnings = []
        if payload.stats.nodeCount == 0:
            warnings.append("No graph nodes matched the current command.")

        return GraphQueryResponse(
            status="ok",
            phase=settings.phase,
            source="neo4j",
            graph=payload,
            query=GraphQueryMeta(
                mode=intent.mode,
                command=intent.command,
                summary=intent.summary,
                cypher=_clean_cypher(intent.cypher),
            ),
            warnings=warnings,
        )

    def verify_connectivity(self) -> None:
        try:
            self._get_driver().verify_connectivity()
        except Exception as exc:  # pragma: no cover - defensive runtime path
            raise GraphServiceUnavailable("Neo4j connectivity check failed.") from exc

    def close(self) -> None:
        if self._driver is not None:
            self._driver.close()
            self._driver = None
            self._seed_checked = False

    def _get_driver(self):
        if not (settings.neo4j_uri and settings.neo4j_username and settings.neo4j_password):
            raise GraphServiceUnavailable("Neo4j credentials are not configured.")

        if self._driver is None:
            try:
                from neo4j import GraphDatabase
            except ModuleNotFoundError as exc:  # pragma: no cover - environment-specific path
                raise GraphServiceUnavailable(
                    "The neo4j Python package is not installed in the backend environment."
                ) from exc

            self._driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
            )

        return self._driver

    def _ensure_seeded(self) -> None:
        if self._seed_checked:
            return

        driver = self._get_driver()
        try:
            driver.verify_connectivity()
            with driver.session() as session:
                session.execute_write(_ensure_graph_schema_transaction)
                session.execute_write(_seed_graph_transaction)
        except Exception as exc:
            raise GraphServiceUnavailable("Neo4j is unavailable for Phase 2 graph queries.") from exc

        self._seed_checked = True

    def _run_graph_query(self, cypher: str, params: dict[str, Any]) -> GraphPayload:
        driver = self._get_driver()
        try:
            with driver.session() as session:
                record = session.execute_read(_read_graph_transaction, cypher, params)
        except Exception as exc:
            raise GraphServiceUnavailable("Neo4j read query failed.") from exc

        nodes = [GraphNode.model_validate(node) for node in record["nodes"]]
        links = [GraphLink.model_validate(link) for link in record["links"]]
        type_counts = {node_type: 0 for node_type in ("person", "project", "concept", "document")}
        for node in nodes:
            type_counts[node.type] = type_counts.get(node.type, 0) + 1

        return GraphPayload(
            nodes=nodes,
            links=links,
            stats=GraphStats(
                nodeCount=len(nodes),
                linkCount=len(links),
                typeCounts=type_counts,
                seed=SEED_VALUE,
            ),
        )


def build_graph_intent(
    command: str,
    visible_node_ids: list[str],
    selected_node_ids: list[str],
) -> GraphIntent:
    _ = visible_node_ids
    normalized = _normalize_command(command)
    tokens = set(normalized.split())

    if WRITE_PATTERNS & tokens:
        raise GraphQueryBlocked("Phase 2 only supports read-only graph commands.")

    if normalized in {"show all", "all", "reset", "everything"}:
        return GraphIntent(
            mode="all",
            command=command,
            summary="Reset the Nebula view to the full graph.",
            cypher=SNAPSHOT_CYPHER,
            params={"root_limit": 160},
        )

    if selected_node_ids and tokens & {"neighbors", "neighbours", "connected", "related"}:
        return GraphIntent(
            mode="neighbors",
            command=command,
            summary="Focused on the selected node and its direct neighbors.",
            cypher=_build_intent_cypher("root.id IN $selected_ids"),
            params={
                "selected_ids": selected_node_ids,
                "root_limit": 80,
            },
        )

    for token in tokens:
        if token in TYPE_ALIASES:
            node_type = TYPE_ALIASES[token]
            return GraphIntent(
                mode="type",
                command=command,
                summary=f"Filtered the graph to emphasize {node_type} nodes and their adjacent context.",
                cypher=_build_intent_cypher("root.type = $node_type"),
                params={"node_type": node_type, "root_limit": 100},
            )

    for token in tokens:
        if token in CLUSTER_ALIASES:
            cluster = CLUSTER_ALIASES[token]
            return GraphIntent(
                mode="cluster",
                command=command,
                summary=f"Focused the graph on the {cluster} cluster.",
                cypher=_build_intent_cypher("root.cluster = $cluster"),
                params={"cluster": cluster, "root_limit": 90},
            )

    search_term = _extract_search_term(normalized)
    return GraphIntent(
        mode="search",
        command=command,
        summary=f"Searched Neo4j for nodes matching '{search_term}'.",
        cypher=_build_intent_cypher(
            """
                toLower(root.name) CONTAINS $search
                OR toLower(root.summary) CONTAINS $search
                OR toLower(root.cluster) CONTAINS $search
                OR toLower(root.type) CONTAINS $search
            """
        ),
        params={"search": search_term, "root_limit": 80},
    )


def _seed_graph_transaction(tx) -> None:
    result = tx.run("MATCH (node:NebulaNode) RETURN count(node) AS count").single()
    if result and int(result["count"]) > 0:
        return

    seed_graph = generate_seed_graph()
    tx.run(
        """
        UNWIND $nodes AS node
        MERGE (entity:NebulaNode {id: node.id})
        SET entity += node
        """,
        nodes=seed_graph.nodes,
    )
    tx.run(
        """
        UNWIND $links AS link
        MATCH (source:NebulaNode {id: link.source})
        MATCH (target:NebulaNode {id: link.target})
        MERGE (source)-[rel:RELATED_TO {id: link.id}]->(target)
        SET rel.weight = link.weight,
            rel.kind = link.kind
        """,
        links=seed_graph.links,
    )


def _ensure_graph_schema_transaction(tx) -> None:
    tx.run(
        "CREATE CONSTRAINT nebula_node_id IF NOT EXISTS FOR (node:NebulaNode) REQUIRE node.id IS UNIQUE"
    ).consume()


def _read_graph_transaction(tx, cypher: str, params: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    root_record = tx.run(cypher, **params).single()
    if not root_record:
        return {"nodes": [], "links": []}

    root_ids = [node_id for node_id in root_record.get("root_ids", []) if node_id]
    if not root_ids:
        return {"nodes": [], "links": []}

    neighbor_record = tx.run(
        """
        MATCH (root:NebulaNode)
        WHERE root.id IN $root_ids
        OPTIONAL MATCH (root)-[:RELATED_TO]-(neighbor:NebulaNode)
        RETURN collect(DISTINCT root.id) + collect(DISTINCT neighbor.id) AS node_ids
        """,
        root_ids=root_ids,
    ).single()
    node_ids = sorted({node_id for node_id in neighbor_record.get("node_ids", []) if node_id})
    if not node_ids:
        return {"nodes": [], "links": []}

    node_record = tx.run(
        """
        MATCH (node:NebulaNode)
        WHERE node.id IN $node_ids
        OPTIONAL MATCH (node)-[edge:RELATED_TO]-()
        WITH node, count(DISTINCT edge) AS connections
        RETURN collect(node {.*, connections: connections}) AS nodes
        """,
        node_ids=node_ids,
    ).single()
    link_record = tx.run(
        """
        MATCH (source:NebulaNode)-[rel:RELATED_TO]-(target:NebulaNode)
        WHERE source.id IN $node_ids AND target.id IN $node_ids
        RETURN collect(DISTINCT rel {.*, source: startNode(rel).id, target: endNode(rel).id}) AS links
        """,
        node_ids=node_ids,
    ).single()

    nodes = [_serialize_node(node) for node in node_record.get("nodes", []) if node]
    links = [_serialize_link(link) for link in link_record.get("links", []) if link]
    return {"nodes": nodes, "links": links}


def _serialize_node(payload: dict[str, Any]) -> dict[str, Any]:
    raw = dict(payload)

    return {
        "id": raw["id"],
        "name": raw["name"],
        "type": raw["type"],
        "cluster": raw["cluster"],
        "priority": float(raw["priority"]),
        "signalStrength": float(raw["signalStrength"]),
        "summary": raw["summary"],
        "updatedAt": raw["updatedAt"],
        "connections": int(raw.get("connections", 0)),
        "x": float(raw["x"]),
        "y": float(raw["y"]),
        "z": float(raw["z"]),
    }


def _serialize_link(payload: dict[str, Any]) -> dict[str, Any]:
    raw = dict(payload)

    return {
        "id": raw["id"],
        "source": raw["source"],
        "target": raw["target"],
        "weight": float(raw["weight"]),
        "kind": raw["kind"],
    }


def _normalize_command(command: str) -> str:
    return re.sub(r"\s+", " ", command.strip().lower())


def _extract_search_term(normalized_command: str) -> str:
    tokens = [token for token in re.findall(r"[a-z0-9-]+", normalized_command) if token not in STOP_WORDS]
    return " ".join(tokens) or normalized_command


def _clean_cypher(cypher: str) -> str:
    return re.sub(r"\s+", " ", cypher).strip()


def _build_intent_cypher(where_clause: str) -> str:
    return INTENT_CYPHER_TEMPLATE.replace("__WHERE_CLAUSE__", where_clause.strip())


@lru_cache(maxsize=1)
def get_graph_service() -> Neo4jGraphService:
    return Neo4jGraphService()
