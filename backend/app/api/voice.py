"""Phase 6 voice transcription API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.models.voice import VoiceTranscriptionResponse
from app.services.voice_service import (
    FasterWhisperVoiceService,
    VoiceServiceUnavailable,
    get_voice_service,
)

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    request: Request,
    service: FasterWhisperVoiceService = Depends(get_voice_service),
) -> VoiceTranscriptionResponse:
    """Transcribe a short recorded command clip."""

    audio_bytes = await request.body()

    try:
        result = service.transcribe(audio_bytes, request.headers.get("content-type"))
    except VoiceServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return VoiceTranscriptionResponse(
        phase=settings.phase,
        provider=result.provider,
        transcript=result.transcript,
        language=result.language,
        warnings=result.warnings,
    )
