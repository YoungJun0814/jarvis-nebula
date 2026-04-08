"""WebSocket stub aligned to the Phase 0 contract."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings

router = APIRouter()


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def _send_envelope(websocket: WebSocket, message_type: str, payload: dict[str, object]) -> None:
    await websocket.send_json(
        {
            "type": message_type,
            "ts": _utc_timestamp(),
            "payload": payload,
        }
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Provide a minimal contract-compatible WebSocket for smoke testing."""
    await websocket.accept()
    await _send_envelope(
        websocket,
        "system_status",
        {
            "app": settings.app_name,
            "phase": settings.phase,
            "message": "WebSocket scaffold is ready.",
        },
    )

    try:
        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type == "client_ready":
                await _send_envelope(
                    websocket,
                    "system_status",
                    {
                        "phase": settings.phase,
                        "message": "Client acknowledged scaffold readiness.",
                    },
                )
                continue

            await _send_envelope(
                websocket,
                "error",
                {
                    "phase": settings.phase,
                    "message": f"Unhandled WebSocket message type: {message_type!r}",
                },
            )
    except WebSocketDisconnect:
        return
