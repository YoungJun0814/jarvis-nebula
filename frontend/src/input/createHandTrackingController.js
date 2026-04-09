import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

import { classifyHandGesture } from './classifyHandGesture.js';
import { createGestureStateMachine } from './createGestureStateMachine.js';
import { smoothHands } from './smoothLandmarks.js';

const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const HAND_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export function createHandTrackingController({
  videoElement,
  onFrame = () => {},
  onStatusChange = () => {},
}) {
  let handLandmarker = null;
  let mediaStream = null;
  let animationFrameId = null;
  let isRunning = false;
  let previousHands = [];
  let previousPointer = null;
  let previousZoomSpan = null;
  let pointerHistory = [];
  const gestureStateMachine = createGestureStateMachine();

  return {
    async start() {
      if (isRunning) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        onStatusChange({
          enabled: false,
          status: 'unsupported',
          gesture: 'none',
          confidence: 0,
          message: 'Camera APIs are not available in this browser.',
          handCount: 0,
        });
        return;
      }

      onStatusChange({
        enabled: false,
        status: 'starting',
        gesture: 'none',
        confidence: 0,
        message: 'Requesting webcam access for hand tracking...',
        handCount: 0,
      });

      try {
        if (!handLandmarker) {
          const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
          handLandmarker = await HandLandmarker.createFromModelPath(
            vision,
            HAND_LANDMARKER_MODEL_URL,
          );
          await handLandmarker.setOptions({
            runningMode: 'VIDEO',
            numHands: 2,
          });
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 960 },
            height: { ideal: 540 },
          },
          audio: false,
        });

        videoElement.srcObject = mediaStream;
        videoElement.playsInline = true;
        videoElement.muted = true;
        await videoElement.play();

        isRunning = true;
        previousHands = [];
        previousPointer = null;
        previousZoomSpan = null;
        pointerHistory = [];
        gestureStateMachine.reset();

        onStatusChange({
          enabled: true,
          status: 'running',
          gesture: 'none',
          confidence: 0,
          message: 'Hand tracking is active.',
          handCount: 0,
        });

        animationFrameId = requestAnimationFrame(processFrame);
      } catch (error) {
        stopTracks();
        onStatusChange({
          enabled: false,
          status: 'error',
          gesture: 'none',
          confidence: 0,
          message: formatControllerError(error),
          handCount: 0,
        });
      }
    },
    stop() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      isRunning = false;
      previousHands = [];
      previousPointer = null;
      previousZoomSpan = null;
      pointerHistory = [];
      gestureStateMachine.reset();
      stopTracks();

      onStatusChange({
        enabled: false,
        status: 'idle',
        gesture: 'none',
        confidence: 0,
        message: 'Hand tracking is off.',
        handCount: 0,
      });
    },
    destroy() {
      this.stop();
      if (videoElement) {
        videoElement.srcObject = null;
      }
    },
  };

  function processFrame() {
    if (!isRunning || !handLandmarker || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }

    const results = handLandmarker.detectForVideo(videoElement, performance.now());
    const rawHands = (results.landmarks ?? []).map((landmarks, index) => ({
      handedness: results.handednesses?.[index]?.[0]?.categoryName ?? 'Unknown',
      landmarks: landmarks.map((point) => ({ x: point.x, y: point.y, z: point.z })),
    }));
    const hands = smoothHands(previousHands, rawHands);
    previousHands = hands;

    const gestureResult = classifyHandGesture(hands);

    const pointer = gestureResult.pointer;
    const deltaNormalized =
      pointer && previousPointer
        ? {
            x: pointer.x - previousPointer.x,
            y: pointer.y - previousPointer.y,
          }
        : { x: 0, y: 0 };
    previousPointer = pointer ?? null;

    pointerHistory = updatePointerHistory(pointerHistory, pointer);

    const swipe = detectSwipe(pointerHistory, gestureResult);
    const nextGesture = swipe ? 'swipe' : gestureResult.gesture;
    const nextConfidence = swipe ? 0.91 : gestureResult.confidence;
    const gestureState = gestureStateMachine.update({
      gesture: nextGesture,
      confidence: nextConfidence,
    });

    let zoomDelta = 0;
    if (nextGesture === 'zoom' && gestureResult.zoomSpan != null) {
      if (previousZoomSpan != null) {
        zoomDelta = gestureResult.zoomSpan - previousZoomSpan;
      }
      previousZoomSpan = gestureResult.zoomSpan;
    } else {
      previousZoomSpan = null;
    }

    onStatusChange({
      enabled: true,
      status: 'running',
      gesture: gestureState.gesture,
      confidence: nextConfidence,
      message:
        gestureState.gesture === 'none'
          ? 'Hand tracking is active. Show a gesture to control the nebula.'
          : `Gesture detected: ${gestureState.gesture.replaceAll('_', ' ')}.`,
      handCount: gestureResult.handCount,
    });

    onFrame({
      hands,
      gesture: gestureState.gesture,
      gesturePhase: gestureState.phase,
      confidence: nextConfidence,
      pointerNormalized: pointer,
      deltaNormalized,
      zoomDelta,
      stable: gestureState.active,
      holdFrames: gestureState.stableFrames,
      handCount: gestureResult.handCount,
      swipeDirection: swipe?.direction ?? null,
    });

    animationFrameId = requestAnimationFrame(processFrame);
  }

  function stopTracks() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  }
}

function formatControllerError(error) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Webcam permission was denied. Mouse and keyboard remain fully available.';
  }

  return 'Hand tracking could not start in this browser session.';
}

function updatePointerHistory(history, pointer) {
  const nextHistory = history.slice(-5);

  if (pointer) {
    nextHistory.push({
      ...pointer,
      timestamp: performance.now(),
    });
  } else {
    nextHistory.length = 0;
  }

  return nextHistory;
}

function detectSwipe(pointerHistory, gestureResult) {
  if (gestureResult.gesture !== 'open_palm' || pointerHistory.length < 4) {
    return null;
  }

  const first = pointerHistory[0];
  const last = pointerHistory[pointerHistory.length - 1];
  const elapsedMs = Math.max(1, last.timestamp - first.timestamp);
  const deltaX = last.x - first.x;
  const deltaY = last.y - first.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (elapsedMs > 420 || distance < 0.16 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) {
    return null;
  }

  return {
    direction: deltaX > 0 ? 'right' : 'left',
  };
}
