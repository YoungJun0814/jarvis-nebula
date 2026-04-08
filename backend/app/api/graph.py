"""Graph query API stubs."""

from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.config import settings


class GraphQueryRequest(BaseModel):
    command: str = Field(min_length=1, description="Natural language graph query.")
    visible_node_ids: list[str] = Field(default_factory=list)
    selected_node_ids: list[str] = Field(default_factory=list)


router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/query", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def query_graph(request: GraphQueryRequest) -> dict[str, object]:
    """Reserve the graph query path for Phase 2."""
    return {
        "status": "not_implemented",
        "phase": settings.phase,
        "message": "Graph querying starts in Phase 2.",
        "received_command": request.command,
    }
