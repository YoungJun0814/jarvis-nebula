import { describe, expect, it } from 'vitest';

import {
  calculateChestAnchor,
  calculatePoseSensitivity,
  updateTrackingPerformance,
} from './poseTracking.js';

describe('poseTracking', () => {
  it('calculates the chest anchor from shoulders and hips', () => {
    const pose = createPoseFixture();

    expect(calculateChestAnchor(pose)).toMatchObject({
      x: 0.5,
      y: 0.48,
    });
  });

  it('maps close-range control points to the close sensitivity zone', () => {
    const pose = createPoseFixture();

    const result = calculatePoseSensitivity({
      poseLandmarks: pose,
      hands: [
        {
          landmarks: createHandLandmarks({ x: 0.5, y: 0.42 }),
        },
      ],
    });

    expect(result.zone).toBe('close');
    expect(result.multiplier).toBeLessThan(1);
  });

  it('falls back to the far zone when the hands are extended away from the chest', () => {
    const pose = createPoseFixture();

    const result = calculatePoseSensitivity({
      poseLandmarks: pose,
      hands: [
        {
          landmarks: createHandLandmarks({ x: 0.82, y: 0.34 }),
        },
      ],
    });

    expect(result.zone).toBe('far');
    expect(result.multiplier).toBeGreaterThan(1);
  });

  it('marks pose fallback when performance degrades under the target budget', () => {
    const result = updateTrackingPerformance(
      {
        averageProcessingMs: 24,
        averageFps: 31,
      },
      {
        processingMs: 34,
        elapsedMs: 40,
      },
    );

    expect(result.poseFallback).toBe(true);
  });
});

function createPoseFixture() {
  return Array.from({ length: 33 }, (_, index) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: index < 25 ? 0.92 : 0.8,
  })).map((point, index) => {
    if (index === 11) return { ...point, x: 0.4, y: 0.36 };
    if (index === 12) return { ...point, x: 0.6, y: 0.36 };
    if (index === 15) return { ...point, x: 0.46, y: 0.68 };
    if (index === 16) return { ...point, x: 0.54, y: 0.68 };
    if (index === 23) return { ...point, x: 0.43, y: 0.6 };
    if (index === 24) return { ...point, x: 0.57, y: 0.6 };
    return point;
  });
}

function createHandLandmarks({ x, y }) {
  return Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
}
