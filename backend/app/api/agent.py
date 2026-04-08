"""Agent API stubs."""

from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.config import settings


class AgentCommandRequest(BaseModel):
    command: str = Field(min_length=1, description="English command for the agent.")
    selected_node_ids: list[str] = Field(default_factory=list)


router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/command", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def agent_command(request: AgentCommandRequest) -> dict[str, object]:
    """Reserve the contract for Phase 8 agent execution."""
    return {
        "status": "not_implemented",
        "phase": settings.phase,
        "message": "Agent task execution starts in Phase 8.",
        "received_command": request.command,
    }
