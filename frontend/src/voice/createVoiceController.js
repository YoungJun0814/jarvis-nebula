import { transcribeVoice } from '../services/voiceApi.js';

export function createVoiceController({
  onStatusChange = () => {},
  onTranscript = () => {},
}) {
  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];
  let isRecording = false;

  return {
    async start(source = 'manual') {
      if (isRecording) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        onStatusChange({
          enabled: false,
          recording: false,
          loading: false,
          source,
          message: 'Voice capture is not supported in this browser.',
        });
        return;
      }

      onStatusChange({
        enabled: true,
        recording: false,
        loading: false,
        source,
        message: 'Preparing the microphone...',
      });

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
          },
          video: false,
        });

        audioChunks = [];
        mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined,
        });
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data?.size) {
            audioChunks.push(event.data);
          }
        });
        mediaRecorder.addEventListener('stop', async () => {
          const audioBlob = new Blob(audioChunks, {
            type: mediaRecorder?.mimeType || 'audio/webm',
          });

          onStatusChange({
            enabled: true,
            recording: false,
            loading: true,
            source,
            message: 'Transcribing the recorded command...',
          });

          try {
            const payload = await transcribeVoice(audioBlob);
            onStatusChange({
              enabled: true,
              recording: false,
              loading: false,
              source,
              message: payload.transcript
                ? `Transcribed: ${payload.transcript}`
                : 'No speech was recognized in the recorded clip.',
            });
            onTranscript(payload);
          } catch (error) {
            onStatusChange({
              enabled: true,
              recording: false,
              loading: false,
              source,
              message:
                error instanceof Error
                  ? error.message
                  : 'Voice transcription is currently unavailable.',
            });
          } finally {
            stopTracks();
          }
        });

        mediaRecorder.start();
        isRecording = true;
        onStatusChange({
          enabled: true,
          recording: true,
          loading: false,
          source,
          message: 'Recording voice command...',
        });
      } catch (error) {
        stopTracks();
        onStatusChange({
          enabled: true,
          recording: false,
          loading: false,
          source,
          message:
            error instanceof DOMException && error.name === 'NotAllowedError'
              ? 'Microphone permission was denied.'
              : 'Voice recording could not start in this browser session.',
        });
      }
    },
    stop() {
      if (!mediaRecorder || !isRecording) {
        return;
      }

      isRecording = false;
      mediaRecorder.stop();
    },
    toggle(source = 'manual') {
      if (isRecording) {
        this.stop();
        return;
      }

      void this.start(source);
    },
    isRecording() {
      return isRecording;
    },
    destroy() {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      stopTracks();
      mediaRecorder = null;
      audioChunks = [];
      isRecording = false;
    },
  };

  function stopTracks() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  }
}
