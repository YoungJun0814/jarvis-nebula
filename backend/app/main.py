"""Backend entrypoint for the Jarvis Nebula scaffold."""

from __future__ import annotations

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.ws.handlers import router as ws_router

app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    summary="Phase 6 multimodal backend for Jarvis Nebula.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)


@app.get("/")
def root() -> dict[str, object]:
    """Provide a simple root payload for smoke tests and local inspection."""
    return {
        "app": settings.app_name,
        "phase": settings.phase,
        "message": "Jarvis Nebula backend graph and voice services are ready.",
    }


def main() -> None:
    """Run the FastAPI app with local development defaults."""
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )


if __name__ == "__main__":
    main()
