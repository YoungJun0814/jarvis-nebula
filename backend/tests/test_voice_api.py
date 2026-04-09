from fastapi.testclient import TestClient

from app.main import app
from app.services.voice_service import VoiceTranscript, get_voice_service


class FakeVoiceService:
    def transcribe(self, audio_bytes: bytes, content_type: str | None = None) -> VoiceTranscript:
        assert audio_bytes == b"synthetic-audio"
        assert content_type == "audio/webm"
        return VoiceTranscript(
            transcript="show archive documents",
            provider="fake-whisper",
            language="en",
            warnings=[],
        )


app.dependency_overrides[get_voice_service] = FakeVoiceService
client = TestClient(app)


def test_voice_transcription_contract() -> None:
    response = client.post(
        "/api/voice/transcribe",
        content=b"synthetic-audio",
        headers={"content-type": "audio/webm"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "fake-whisper"
    assert payload["transcript"] == "show archive documents"
