"""Top-level REST router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.agent import router as agent_router
from app.api.config import router as config_router
from app.api.graph import router as graph_router
from app.api.health import router as health_router
from app.api.voice import router as voice_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(config_router)
api_router.include_router(graph_router)
api_router.include_router(agent_router)
api_router.include_router(voice_router)
