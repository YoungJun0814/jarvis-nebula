"""Voice transcription services for Phase 6."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from tempfile import NamedTemporaryFile


class VoiceServiceUnavailable(RuntimeError):
    """Raised when the configured voice transcription backend cannot run."""


@dataclass(frozen=True)
class VoiceTranscript:
    transcript: str
    provider: str
    language: str
    warnings: list[str]


class FasterWhisperVoiceService:
    """Transcribe short command clips with faster-whisper when available."""

    def __init__(
        self,
        model_size: str = "tiny.en",
        compute_type: str = "int8",
        language: str = "en",
    ) -> None:
        self._model_size = model_size
        self._compute_type = compute_type
        self._language = language
        self._model = None

    def transcribe(self, audio_bytes: bytes, content_type: str | None = None) -> VoiceTranscript:
        if not audio_bytes:
            return VoiceTranscript(
                transcript="",
                provider="faster-whisper",
                language=self._language,
                warnings=["No audio bytes were received."],
            )

        model = self._get_model()
        suffix = guess_audio_suffix(content_type)

        with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = Path(temp_file.name)

        try:
            segments, info = model.transcribe(
                str(temp_path),
                language=self._language,
                beam_size=1,
                vad_filter=True,
            )
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
            warnings = [] if transcript else ["The audio was captured, but no speech was recognized."]
            return VoiceTranscript(
                transcript=transcript,
                provider="faster-whisper",
                language=getattr(info, "language", self._language) or self._language,
                warnings=warnings,
            )
        except Exception as exc:  # pragma: no cover - external runtime dependency path
            raise VoiceServiceUnavailable(
                "Voice transcription failed in the local faster-whisper runtime."
            ) from exc
        finally:
            temp_path.unlink(missing_ok=True)

    def _get_model(self):
        if self._model is not None:
            return self._model

        try:
            from faster_whisper import WhisperModel  # type: ignore
        except ImportError as exc:  # pragma: no cover - exercised by runtime configuration
            raise VoiceServiceUnavailable(
                "Install backend voice extras to enable faster-whisper transcription."
            ) from exc

        self._model = WhisperModel(self._model_size, compute_type=self._compute_type)
        return self._model


@lru_cache(maxsize=1)
def get_voice_service() -> FasterWhisperVoiceService:
    """Provide a cached faster-whisper voice service."""

    return FasterWhisperVoiceService()


def guess_audio_suffix(content_type: str | None) -> str:
    if content_type == "audio/wav":
        return ".wav"
    if content_type == "audio/mp4":
        return ".m4a"
    if content_type == "audio/webm":
        return ".webm"
    return ".webm"
