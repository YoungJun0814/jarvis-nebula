export function smoothHands(previousHands, nextHands, alpha = 0.78) {
  return nextHands.map((hand, index) => {
    const previousHand = previousHands[index];
    if (!previousHand) {
      return hand;
    }

    return {
      ...hand,
      landmarks: hand.landmarks.map((point, pointIndex) => {
        const previousPoint = previousHand.landmarks[pointIndex];
        if (!previousPoint) {
          return point;
        }

        return {
          x: previousPoint.x * alpha + point.x * (1 - alpha),
          y: previousPoint.y * alpha + point.y * (1 - alpha),
          z: previousPoint.z * alpha + point.z * (1 - alpha),
        };
      }),
    };
  });
}
