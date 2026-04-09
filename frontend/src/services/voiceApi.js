export class VoiceApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.name = 'VoiceApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function transcribeVoice(audioBlob) {
  const response = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: {
      'content-type': audioBlob.type || 'audio/webm',
    },
    body: audioBlob,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new VoiceApiError(
      payload?.detail ?? 'Voice transcription failed.',
      response.status,
      payload,
    );
  }

  return payload;
}
