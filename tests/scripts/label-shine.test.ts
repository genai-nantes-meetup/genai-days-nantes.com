import { describe, expect, it } from 'vitest';
import {
  getRenderedShine,
  getTiltShine,
  rotateTiltForScreen,
} from '../../src/scripts/label-shine';

describe('metal label shine movement', () => {
  it('moves opposite to the phone tilt', () => {
    const rightTilt = getTiltShine(12, 0);
    const leftTilt = getTiltShine(-12, 0);
    const bottomTilt = getTiltShine(0, 12);
    const topTilt = getTiltShine(0, -12);

    expect(rightTilt.x).toBeLessThan(50);
    expect(leftTilt.x).toBeGreaterThan(50);
    expect(bottomTilt.y).toBeLessThan(42);
    expect(topTilt.y).toBeGreaterThan(42);
  });

  it('adapts the sensor axes when the screen is in landscape', () => {
    expect(rotateTiltForScreen(10, 0, 90).horizontal).toBeCloseTo(10);
    expect(rotateTiltForScreen(10, 0, 90).vertical).toBeCloseTo(0);
    expect(rotateTiltForScreen(0, 10, 90).horizontal).toBeCloseTo(0);
    expect(rotateTiltForScreen(0, 10, 90).vertical).toBeCloseTo(-10);
  });

  it('keeps the reflection inside the subtle travel range', () => {
    expect(getTiltShine(100, 100)).toEqual({
      x: 18,
      y: 13,
      opacity: 0.36,
    });
  });

  it('boosts the rendered reflection only on mobile', () => {
    const fullTilt = getTiltShine(100, 100);

    expect(getRenderedShine(fullTilt, false).opacity).toBe(0.36);
    expect(getRenderedShine(fullTilt, true).opacity).toBeCloseTo(0.576);
  });
});
