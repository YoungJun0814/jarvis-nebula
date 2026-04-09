"""Shared graph payload models for Phase 2."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    name: str
    type: Literal["person", "project", "concept", "document"]
    cluster: str
    priority: float
    signalStrength: float
    summary: str
    updatedAt: str
    connections: int = Field(ge=0)
    x: float
    y: float
    z: float


class GraphLink(BaseModel):
    id: str
    source: str
    target: str
    weight: float
    kind: str


class GraphStats(BaseModel):
    nodeCount: int
    linkCount: int
    typeCounts: dict[str, int]
    seed: int | None = None


class GraphPayload(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]
    stats: GraphStats


class GraphQueryMeta(BaseModel):
    mode: str
    command: str
    summary: str
    cypher: str
    readOnly: bool = True


class GraphQueryResponse(BaseModel):
    status: Literal["ok"]
    phase: str
    source: Literal["neo4j", "fallback"]
    graph: GraphPayload
    query: GraphQueryMeta
    warnings: list[str] = Field(default_factory=list)
