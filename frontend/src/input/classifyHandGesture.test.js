import { describe, expect, it } from 'vitest';

import { classifyHandGesture } from './classifyHandGesture.js';
import { smoothHands } from './smoothLandmarks.js';

describe('classifyHandGesture', () => {
  it('classifies an open palm gesture', () => {
    const result = classifyHandGesture([createHandFixture({ extended: ['index', 'middle', 'ring', 'pinky'] })]);

    expect(result.gesture).toBe('open_palm');
    expect(result.confidence).toBeGreaterThan(0.75);
  });

  it('classifies a point gesture', () => {
    const result = classifyHandGesture([createHandFixture({ extended: ['index'] })]);

    expect(result.gesture).toBe('point');
  });

  it('classifies a pinch gesture', () => {
    const result = classifyHandGesture([createHandFixture({ extended: ['index'], pinch: true })]);

    expect(result.gesture).toBe('pinch');
  });

  it('classifies a two-hand zoom gesture', () => {
    const result = classifyHandGesture([
      createHandFixture({ pinch: true, extended: ['index'], xOffset: 0.2 }),
      createHandFixture({ pinch: true, extended: ['index'], xOffset: 0.7 }),
    ]);

    expect(result.gesture).toBe('zoom');
    expect(result.handCount).toBe(2);
    expect(result.zoomSpan).toBeGreaterThan(0.2);
  });
});

describe('smoothHands', () => {
  it('smooths landmark movement using EMA', () => {
    const previous = [createHandFixture({ xOffset: 0.2 })];
    const next = [createHandFixture({ xOffset: 0.6 })];

    const smoothed = smoothHands(previous, next, 0.5);

    expect(smoothed[0].landmarks[0].x).toBeCloseTo(0.4);
  });
});

function createHandFixture({ extended = [], pinch = false, xOffset = 0.5 } = {}) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: xOffset, y: 0.7, z: 0 }));

  landmarks[0] = { x: xOffset, y: 0.72, z: 0 };
  landmarks[4] = pinch ? { x: xOffset + 0.02, y: 0.34, z: 0 } : { x: xOffset - 0.12, y: 0.4, z: 0 };
  landmarks[5] = { x: xOffset - 0.05, y: 0.55, z: 0 };
  landmarks[6] = { x: xOffset - 0.04, y: 0.46, z: 0 };
  landmarks[8] = pinch ? { x: xOffset + 0.03, y: 0.33, z: 0 } : { x: xOffset - 0.03, y: 0.34, z: 0 };
  landmarks[9] = { x: xOffset, y: 0.58, z: 0 };
  landmarks[10] = { x: xOffset, y: 0.49, z: 0 };
  landmarks[12] = { x: xOffset, y: 0.36, z: 0 };
  landmarks[13] = { x: xOffset + 0.04, y: 0.6, z: 0 };
  landmarks[14] = { x: xOffset + 0.04, y: 0.51, z: 0 };
  landmarks[16] = { x: xOffset + 0.04, y: 0.38, z: 0 };
  landmarks[17] = { x: xOffset + 0.08, y: 0.62, z: 0 };
  landmarks[18] = { x: xOffset + 0.08, y: 0.53, z: 0 };
  landmarks[20] = { x: xOffset + 0.08, y: 0.4, z: 0 };

  if (!extended.includes('index')) {
    landmarks[8] = { x: xOffset - 0.03, y: 0.61, z: 0 };
  }

  if (!extended.includes('middle')) {
    landmarks[12] = { x: xOffset, y: 0.64, z: 0 };
  }

  if (!extended.includes('ring')) {
    landmarks[16] = { x: xOffset + 0.04, y: 0.65, z: 0 };
  }

  if (!extended.includes('pinky')) {
    landmarks[20] = { x: xOffset + 0.08, y: 0.66, z: 0 };
  }

  return {
    handedness: 'Right',
    landmarks,
  };
}
