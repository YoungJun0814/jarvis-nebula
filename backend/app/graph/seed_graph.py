"""Deterministic sample graph used to seed Neo4j for Phase 2."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


SEED_VALUE = 20260409
NODE_COUNT = 180


@dataclass(frozen=True)
class SeedGraph:
    nodes: list[dict[str, object]]
    links: list[dict[str, object]]


CATEGORY_LIBRARY = {
    "person": {
        "names": ["Avery", "Jordan", "Taylor", "Morgan", "Riley", "Quinn", "Harper", "Rowan"],
        "clusters": ["Operations", "Research", "Design", "Platform"],
        "descriptors": ["owner", "reviewer", "specialist", "lead"],
    },
    "project": {
        "names": ["Helios", "Orion", "Beacon", "Atlas", "Pulse", "Axiom", "Vertex", "Summit"],
        "clusters": ["Launch", "Roadmap", "Infrastructure", "Client"],
        "descriptors": ["initiative", "stream", "milestone", "program"],
    },
    "concept": {
        "names": ["Latency", "Trust", "Inference", "Context", "Workflow", "Insight", "Signal", "Memory"],
        "clusters": ["System", "Behavior", "Planning", "Knowledge"],
        "descriptors": ["model", "pattern", "theme", "framework"],
    },
    "document": {
        "names": ["Spec", "Brief", "Outline", "Journal", "Decision Log", "Incident Note", "Guide", "Memo"],
        "clusters": ["Archive", "Planning", "Operations", "Review"],
        "descriptors": ["artifact", "record", "summary", "reference"],
    },
}

CATEGORY_DISTRIBUTION = [
    ("project", 0.24),
    ("person", 0.2),
    ("concept", 0.28),
    ("document", 0.28),
]


def generate_seed_graph(node_count: int = NODE_COUNT, seed: int = SEED_VALUE) -> SeedGraph:
    rng = random.Random(seed)
    nodes = [_create_node(index, rng) for index in range(node_count)]
    links: list[dict[str, object]] = []
    adjacency: dict[str, set[str]] = {node["id"]: set() for node in nodes}

    for source_index in range(len(nodes)):
        for target_index in range(source_index + 1, len(nodes)):
            source = nodes[source_index]
            target = nodes[target_index]
            same_type_boost = 0.012 if source["type"] == target["type"] else 0
            same_cluster_boost = 0.008 if source["cluster"] == target["cluster"] else 0
            priority_boost = (float(source["priority"]) + float(target["priority"])) / 300
            probability = 0.002 + same_type_boost + same_cluster_boost + priority_boost

            if rng.random() >= probability:
                continue

            weight = round(0.25 + rng.random() * 0.75, 2)
            links.append(
                {
                    "id": f"link-{len(links)}",
                    "source": source["id"],
                    "target": target["id"],
                    "weight": weight,
                    "kind": "semantic" if source["type"] == target["type"] else "reference",
                }
            )
            adjacency[source["id"]].add(target["id"])
            adjacency[target["id"]].add(source["id"])

    _ensure_every_node_has_connection(nodes, links, adjacency, rng)

    for node in nodes:
        node["connections"] = len(adjacency[node["id"]])

    return SeedGraph(nodes=nodes, links=links)


def _create_node(index: int, rng: random.Random) -> dict[str, object]:
    node_type = _choose_weighted_type(rng)
    library = CATEGORY_LIBRARY[node_type]
    name_seed = rng.choice(library["names"])
    cluster = rng.choice(library["clusters"])
    descriptor = rng.choice(library["descriptors"])
    radius = 72 + rng.random() * 54
    theta = rng.random() * math.pi * 2
    phi = math.acos(2 * rng.random() - 1)

    return {
        "id": f"{node_type}-{index + 1}",
        "name": f"{name_seed} {descriptor} {math.floor(index / 8) + 1}",
        "type": node_type,
        "cluster": cluster,
        "priority": round(0.2 + rng.random() * 0.8, 2),
        "signalStrength": round(0.35 + rng.random() * 0.65, 2),
        "summary": _build_summary(node_type, cluster),
        "updatedAt": _build_relative_date(index),
        "x": radius * math.sin(phi) * math.cos(theta),
        "y": radius * math.sin(phi) * math.sin(theta),
        "z": radius * math.cos(phi),
        "connections": 0,
    }


def _ensure_every_node_has_connection(
    nodes: list[dict[str, object]],
    links: list[dict[str, object]],
    adjacency: dict[str, set[str]],
    rng: random.Random,
) -> None:
    for node in nodes:
        if adjacency[node["id"]]:
            continue

        compatible_nodes = [
            candidate
            for candidate in nodes
            if candidate["id"] != node["id"] and candidate["type"] == node["type"]
        ]
        fallback_pool = compatible_nodes or [candidate for candidate in nodes if candidate["id"] != node["id"]]
        target = rng.choice(fallback_pool)
        weight = round(0.35 + rng.random() * 0.4, 2)
        links.append(
            {
                "id": f"link-{len(links)}",
                "source": node["id"],
                "target": target["id"],
                "weight": weight,
                "kind": "stabilizer",
            }
        )
        adjacency[node["id"]].add(target["id"])
        adjacency[target["id"]].add(node["id"])


def _choose_weighted_type(rng: random.Random) -> str:
    roll = rng.random()
    cumulative = 0.0

    for node_type, weight in CATEGORY_DISTRIBUTION:
        cumulative += weight
        if roll <= cumulative:
            return node_type

    return "concept"


def _build_summary(node_type: str, cluster: str) -> str:
    templates = {
        "person": f"Coordinates decisions in the {cluster} cluster and bridges active tasks.",
        "project": f"Tracks delivery momentum for the {cluster} stream and anchors related work.",
        "concept": f"Captures a reusable {cluster.lower()} idea that influences nearby nodes.",
        "document": f"Stores a {cluster.lower()} reference that grounds context for the graph.",
    }
    return templates[node_type]


def _build_relative_date(index: int) -> str:
    month = (index % 12) + 1
    day = (index % 27) + 1
    return f"2026-{month:02d}-{day:02d}"
