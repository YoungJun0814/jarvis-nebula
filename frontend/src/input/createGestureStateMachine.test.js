import { describe, expect, it } from 'vitest';

import { createGestureStateMachine } from './createGestureStateMachine.js';

describe('createGestureStateMachine', () => {
  it('promotes a confident repeated gesture to ACTIVE', () => {
    const machine = createGestureStateMachine();

    const phases = Array.from({ length: 5 }, () =>
      machine.update({
        gesture: 'point',
        confidence: 0.9,
      }),
    );

    expect(phases.at(-1)).toMatchObject({
      gesture: 'point',
      phase: 'ACTIVE',
      active: true,
      stableFrames: 5,
    });
  });

  it('moves through releasing back to idle when the gesture disappears', () => {
    const machine = createGestureStateMachine();

    Array.from({ length: 5 }, () =>
      machine.update({
        gesture: 'pinch',
        confidence: 0.92,
      }),
    );

    const firstRelease = machine.update({
      gesture: 'none',
      confidence: 0,
    });
    const secondRelease = machine.update({
      gesture: 'none',
      confidence: 0,
    });

    expect(firstRelease.phase).toBe('RELEASING');
    expect(secondRelease.phase).toBe('IDLE');
  });
});
