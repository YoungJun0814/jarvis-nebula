"""Health endpoint for the backend."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, object]:
    """Return backend readiness without touching external services."""
    return {
        "app": settings.app_name,
        "status": "ok",
        "phase": settings.phase,
        "services": {
            "api": "ready",
            "gemini": "configured" if settings.gemini_api_key else "missing",
            "neo4j": "configured"
            if settings.neo4j_uri and settings.neo4j_username and settings.neo4j_password
            else "missing",
        },
        "runtimeTargets": {
            "node": ">=20 <25",
            "python": ">=3.11",
        },
    }
