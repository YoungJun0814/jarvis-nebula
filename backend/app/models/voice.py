"""Voice API payloads."""

from __future__ import annotations

from pydantic import BaseModel, Field


class VoiceTranscriptionResponse(BaseModel):
    status: str = "ok"
    phase: str
    provider: str
    transcript: str
    language: str = "en"
    warnings: list[str] = Field(default_factory=list)
