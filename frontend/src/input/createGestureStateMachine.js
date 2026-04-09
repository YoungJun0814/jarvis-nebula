const ACTIVE_THRESHOLD = 5;
const RELEASE_THRESHOLD = 2;

export function createGestureStateMachine() {
  let currentGesture = 'none';
  let stableFrames = 0;
  let releasingFrames = 0;
  let phase = 'IDLE';

  return {
    update({ gesture, confidence }) {
      const nextGesture = confidence >= 0.75 ? gesture : 'none';

      if (nextGesture === 'none') {
        stableFrames = 0;

        if (phase === 'ACTIVE' || phase === 'RELEASING') {
          releasingFrames += 1;
          phase = releasingFrames >= RELEASE_THRESHOLD ? 'IDLE' : 'RELEASING';
        } else {
          phase = 'IDLE';
        }

        currentGesture = 'none';

        return {
          gesture: 'none',
          phase,
          stableFrames: 0,
          active: false,
        };
      }

      releasingFrames = 0;

      if (nextGesture === currentGesture) {
        stableFrames += 1;
      } else {
        currentGesture = nextGesture;
        stableFrames = 1;
      }

      phase = stableFrames >= ACTIVE_THRESHOLD ? 'ACTIVE' : 'PENDING';

      return {
        gesture: currentGesture,
        phase,
        stableFrames,
        active: phase === 'ACTIVE',
      };
    },
    reset() {
      currentGesture = 'none';
      stableFrames = 0;
      releasingFrames = 0;
      phase = 'IDLE';
    },
  };
}
