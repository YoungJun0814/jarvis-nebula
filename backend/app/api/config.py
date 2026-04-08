"""Public configuration endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/config", tags=["system"])


@router.get("/public")
def public_config() -> dict[str, object]:
    """Return browser-safe runtime configuration."""
    return {
        "appName": settings.app_name,
        "language": settings.product_language,
        "phase": settings.phase,
        "wsPath": settings.ws_path,
    }
