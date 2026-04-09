const POSE_INDEX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
};

const DEFAULT_SENSITIVITY = Object.freeze({
  zone: 'fixed',
  multiplier: 1,
  distanceNormalized: 1,
  poseVisible: false,
  chestAnchor: null,
});

export function calculateChestAnchor(poseLandmarks) {
  if (!poseLandmarks?.length) {
    return null;
  }

  const points = [
    poseLandmarks[POSE_INDEX.leftShoulder],
    poseLandmarks[POSE_INDEX.rightShoulder],
    poseLandmarks[POSE_INDEX.leftHip],
    poseLandmarks[POSE_INDEX.rightHip],
  ].filter(Boolean);

  if (points.length < 4) {
    return null;
  }

  return averagePoint(points);
}

export function calculatePoseSensitivity({ poseLandmarks, hands = [] }) {
  const chestAnchor = calculateChestAnchor(poseLandmarks);
  if (!chestAnchor) {
    return DEFAULT_SENSITIVITY;
  }

  const leftShoulder = poseLandmarks[POSE_INDEX.leftShoulder];
  const rightShoulder = poseLandmarks[POSE_INDEX.rightShoulder];
  const shoulderWidth = Math.max(0.08, distance(leftShoulder, rightShoulder));
  const driverPoint = getDriverPoint(poseLandmarks, hands);
  const distanceNormalized = distance(driverPoint, chestAnchor) / shoulderWidth;

  if (distanceNormalized < 0.8) {
    return {
      zone: 'close',
      multiplier: 0.7,
      distanceNormalized,
      poseVisible: true,
      chestAnchor,
    };
  }

  if (distanceNormalized < 1.55) {
    return {
      zone: 'medium',
      multiplier: 1,
      distanceNormalized,
      poseVisible: true,
      chestAnchor,
    };
  }

  return {
    zone: 'far',
    multiplier: 1.35,
    distanceNormalized,
    poseVisible: true,
    chestAnchor,
  };
}

export function updateTrackingPerformance(previous, { processingMs, elapsedMs }) {
  const previousAverageMs = previous?.averageProcessingMs ?? processingMs;
  const previousAverageFps = previous?.averageFps ?? 60;

  const averageProcessingMs = previousAverageMs * 0.82 + processingMs * 0.18;
  const instantaneousFps = elapsedMs > 0 ? 1000 / elapsedMs : previousAverageFps;
  const averageFps = previousAverageFps * 0.82 + instantaneousFps * 0.18;
  const poseFallback = averageProcessingMs > 25 || averageFps < 30;

  return {
    averageProcessingMs,
    averageFps,
    poseFallback,
  };
}

function getDriverPoint(poseLandmarks, hands) {
  if (hands.length) {
    const palmCenters = hands.map((hand) => getPalmCenter(hand.landmarks));
    return averagePoint(palmCenters);
  }

  return averagePoint([
    poseLandmarks[POSE_INDEX.leftWrist],
    poseLandmarks[POSE_INDEX.rightWrist],
  ]);
}

function getPalmCenter(landmarks) {
  return averagePoint([0, 5, 9, 13, 17].map((index) => landmarks[index]));
}

function averagePoint(points) {
  const validPoints = points.filter(Boolean);
  const total = validPoints.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + (point.z ?? 0),
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / validPoints.length,
    y: total.y / validPoints.length,
    z: total.z / validPoints.length,
  };
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}
