const FINGER_JOINTS = {
  index: [5, 6, 8],
  middle: [9, 10, 12],
  ring: [13, 14, 16],
  pinky: [17, 18, 20],
};

export function classifyHandGesture(hands) {
  if (!hands.length) {
    return createGestureResult('none', { confidence: 0, handCount: 0 });
  }

  if (hands.length >= 2 && hands.every(isPinchGesture)) {
    const pinchCenters = hands.slice(0, 2).map(getPinchCenter);
    return createGestureResult('zoom', {
      confidence: Math.min(...hands.map(getPinchConfidence)),
      handCount: 2,
      pointer: midpoint(pinchCenters[0], pinchCenters[1]),
      zoomSpan: distance(pinchCenters[0], pinchCenters[1]),
    });
  }

  const primaryHand = hands[0];

  if (isPinchGesture(primaryHand)) {
    return createGestureResult('pinch', {
      confidence: getPinchConfidence(primaryHand),
      handCount: 1,
      pointer: getPinchCenter(primaryHand),
    });
  }

  if (isPointGesture(primaryHand)) {
    return createGestureResult('point', {
      confidence: 0.9,
      handCount: 1,
      pointer: primaryHand.landmarks[8],
    });
  }

  if (isFistGesture(primaryHand)) {
    return createGestureResult('fist', {
      confidence: 0.84,
      handCount: 1,
      pointer: getPalmCenter(primaryHand),
    });
  }

  if (isOpenPalmGesture(primaryHand)) {
    return createGestureResult('open_palm', {
      confidence: 0.86,
      handCount: 1,
      pointer: getPalmCenter(primaryHand),
    });
  }

  return createGestureResult('none', {
    confidence: 0.15,
    handCount: 1,
    pointer: getPalmCenter(primaryHand),
  });
}

function createGestureResult(gesture, extras = {}) {
  return {
    gesture,
    confidence: extras.confidence ?? 0,
    pointer: extras.pointer ?? null,
    zoomSpan: extras.zoomSpan ?? null,
    handCount: extras.handCount ?? 0,
  };
}

function isOpenPalmGesture(hand) {
  return ['index', 'middle', 'ring', 'pinky'].every((fingerName) => isFingerExtended(hand, fingerName));
}

function isPointGesture(hand) {
  return (
    isFingerExtended(hand, 'index') &&
    !isFingerExtended(hand, 'middle') &&
    !isFingerExtended(hand, 'ring') &&
    !isFingerExtended(hand, 'pinky')
  );
}

function isFistGesture(hand) {
  return ['index', 'middle', 'ring', 'pinky'].every((fingerName) => !isFingerExtended(hand, fingerName));
}

function isPinchGesture(hand) {
  return distance(hand.landmarks[4], hand.landmarks[8]) < 0.055;
}

function getPinchConfidence(hand) {
  return Math.max(0.75, 1 - distance(hand.landmarks[4], hand.landmarks[8]) * 12);
}

function isFingerExtended(hand, fingerName) {
  const [mcpIndex, pipIndex, tipIndex] = FINGER_JOINTS[fingerName];
  const mcp = hand.landmarks[mcpIndex];
  const pip = hand.landmarks[pipIndex];
  const tip = hand.landmarks[tipIndex];

  return tip.y < pip.y && pip.y < mcp.y;
}

function getPinchCenter(hand) {
  return midpoint(hand.landmarks[4], hand.landmarks[8]);
}

function getPalmCenter(hand) {
  const basePoints = [0, 5, 9, 13, 17].map((index) => hand.landmarks[index]);
  const total = basePoints.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
      z: sum.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: total.x / basePoints.length,
    y: total.y / basePoints.length,
    z: total.z / basePoints.length,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
