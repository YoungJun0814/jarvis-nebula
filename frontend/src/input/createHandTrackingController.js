import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

import { classifyHandGesture } from './classifyHandGesture.js';
import { createGestureStateMachine } from './createGestureStateMachine.js';
import { calculatePoseSensitivity, updateTrackingPerformance } from './poseTracking.js';
import { smoothHands } from './smoothLandmarks.js';

const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const HAND_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const POSE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const TRACKING_FRAME_INTERVAL_MS = 1000 / 30;

export function createHandTrackingController({
  videoElement,
  onFrame = () => {},
  onStatusChange = () => {},
}) {
  let handLandmarker = null;
  let poseLandmarker = null;
  let mediaStream = null;
  let animationFrameId = null;
  let isRunning = false;
  let previousHands = [];
  let previousPointer = null;
  let previousZoomSpan = null;
  let pointerHistory = [];
  let lastProcessingTimestamp = 0;
  let lastFrameTimestamp = 0;
  let lastGestureMotionTimestamp = 0;
  let poseAvailable = true;
  let performanceState = {
    averageProcessingMs: 14,
    averageFps: 60,
    poseFallback: false,
  };
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
        if (!handLandmarker || !poseLandmarker) {
          const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
          if (!handLandmarker) {
            handLandmarker = await HandLandmarker.createFromModelPath(
              vision,
              HAND_LANDMARKER_MODEL_URL,
            );
            await handLandmarker.setOptions({
              runningMode: 'VIDEO',
              numHands: 2,
            });
          }

          if (!poseLandmarker) {
            try {
              poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: POSE_LANDMARKER_MODEL_URL,
                },
                runningMode: 'VIDEO',
                numPoses: 1,
              });
              poseAvailable = true;
            } catch {
              poseLandmarker = null;
              poseAvailable = false;
            }
          }
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
        lastProcessingTimestamp = 0;
        lastFrameTimestamp = 0;
        lastGestureMotionTimestamp = performance.now();
        performanceState = {
          averageProcessingMs: 14,
          averageFps: 60,
          poseFallback: !poseLandmarker,
        };
        gestureStateMachine.reset();

        onStatusChange({
          enabled: true,
          status: 'running',
          gesture: 'none',
          confidence: 0,
          message: poseLandmarker
            ? 'Hand and pose tracking are active.'
            : 'Hand tracking is active. Pose sensitivity is unavailable, so fixed sensitivity is in use.',
          handCount: 0,
          poseEnabled: Boolean(poseLandmarker),
          poseFallback: !poseLandmarker,
          poseZone: poseLandmarker ? 'medium' : 'fixed',
          poseMultiplier: 1,
          poseDistance: 1,
          poseVisible: false,
          trackingBudgetMs: performanceState.averageProcessingMs,
          trackingFps: performanceState.averageFps,
          gestureIdle: false,
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
      lastProcessingTimestamp = 0;
      lastFrameTimestamp = 0;
      lastGestureMotionTimestamp = 0;
      performanceState = {
        averageProcessingMs: 14,
        averageFps: 60,
        poseFallback: false,
      };
      poseAvailable = true;
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

  function processFrame(frameTimestamp = performance.now()) {
    if (!isRunning || !handLandmarker || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }

    if (lastProcessingTimestamp && frameTimestamp - lastProcessingTimestamp < TRACKING_FRAME_INTERVAL_MS) {
      animationFrameId = requestAnimationFrame(processFrame);
      return;
    }

    lastProcessingTimestamp = frameTimestamp;
    const detectionStart = performance.now();
    const results = handLandmarker.detectForVideo(videoElement, frameTimestamp);
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

    let poseSensitivity = {
      zone: 'fixed',
      multiplier: 1,
      distanceNormalized: 1,
      poseVisible: false,
      chestAnchor: null,
    };
    if (!performanceState.poseFallback && poseLandmarker) {
      const poseResult = poseLandmarker.detectForVideo(videoElement, frameTimestamp);
      const rawPoseLandmarks = Array.isArray(poseResult.landmarks?.[0])
        ? poseResult.landmarks[0]
        : poseResult.landmarks;

      const poseLandmarks = rawPoseLandmarks?.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: point.visibility,
      }));

      poseSensitivity = calculatePoseSensitivity({
        poseLandmarks,
        hands,
      });
    }

    const gestureMotion =
      Math.hypot(deltaNormalized.x, deltaNormalized.y) > 0.0025 || nextGesture === 'zoom';
    if (gestureMotion || nextGesture !== 'none') {
      lastGestureMotionTimestamp = frameTimestamp;
    }

    const processingMs = performance.now() - detectionStart;
    performanceState = updateTrackingPerformance(performanceState, {
      processingMs,
      elapsedMs: lastFrameTimestamp ? frameTimestamp - lastFrameTimestamp : TRACKING_FRAME_INTERVAL_MS,
    });
    lastFrameTimestamp = frameTimestamp;

    const poseFallback = performanceState.poseFallback || !poseLandmarker;
    const gestureIdle =
      nextGesture === 'none' && frameTimestamp - lastGestureMotionTimestamp > 900;

    onStatusChange({
      enabled: true,
      status: 'running',
      gesture: gestureState.gesture,
      phase: gestureState.phase,
      confidence: nextConfidence,
      message:
        poseFallback
          ? 'Hand tracking is active. Pose fallback is using fixed sensitivity to stay responsive.'
          : gestureState.gesture === 'none'
            ? 'Hand and pose tracking are active. Show a gesture to control the nebula.'
            : `Gesture detected: ${gestureState.gesture.replaceAll('_', ' ')}.`,
      handCount: gestureResult.handCount,
      poseEnabled: !poseFallback && poseAvailable,
      poseFallback,
      poseZone: poseFallback ? 'fixed' : poseSensitivity.zone,
      poseMultiplier: poseFallback ? 1 : poseSensitivity.multiplier,
      poseDistance: poseSensitivity.distanceNormalized,
      poseVisible: poseSensitivity.poseVisible,
      trackingBudgetMs: performanceState.averageProcessingMs,
      trackingFps: performanceState.averageFps,
      gestureIdle,
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
      sensitivityMultiplier: poseFallback ? 1 : poseSensitivity.multiplier,
      pose: {
        zone: poseFallback ? 'fixed' : poseSensitivity.zone,
        multiplier: poseFallback ? 1 : poseSensitivity.multiplier,
        distanceNormalized: poseSensitivity.distanceNormalized,
        visible: poseSensitivity.poseVisible,
        fallback: poseFallback,
        averageProcessingMs: performanceState.averageProcessingMs,
        averageFps: performanceState.averageFps,
        idle: gestureIdle,
        chestAnchor: poseSensitivity.chestAnchor,
      },
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
