"""Phase 2 graph APIs backed by Neo4j."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.graph import GraphQueryResponse
from app.services.neo4j_graph import (
    GraphQueryBlocked,
    GraphServiceUnavailable,
    Neo4jGraphService,
    get_graph_service,
)


class GraphQueryRequest(BaseModel):
    command: str = Field(min_length=1, description="Natural language graph query.")
    visible_node_ids: list[str] = Field(default_factory=list)
    selected_node_ids: list[str] = Field(default_factory=list)


router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/snapshot", response_model=GraphQueryResponse)
def graph_snapshot(service: Neo4jGraphService = Depends(get_graph_service)) -> GraphQueryResponse:
    """Load the current graph snapshot from Neo4j."""
    try:
        return service.get_snapshot()
    except GraphServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/query", response_model=GraphQueryResponse)
def query_graph(
    request: GraphQueryRequest,
    service: Neo4jGraphService = Depends(get_graph_service),
) -> GraphQueryResponse:
    """Execute a read-only graph query against Neo4j."""
    try:
        return service.run_command(
            request.command,
            visible_node_ids=request.visible_node_ids,
            selected_node_ids=request.selected_node_ids,
        )
    except GraphQueryBlocked as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except GraphServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
