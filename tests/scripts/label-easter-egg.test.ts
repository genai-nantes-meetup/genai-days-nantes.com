import { describe, expect, it } from 'vitest';
import {
  createLiftPlacement,
  createModalConfettiSequence,
  getArchiveRestickAffordance,
  getArchiveVisualViewportTop,
} from '../../src/scripts/label-easter-egg';

describe('label archive visual viewport anchoring', () => {
  it('pins the archive bottom to the visible viewport', () => {
    expect(getArchiveVisualViewportTop(650, 0, 206)).toBe(444);
  });

  it('moves the archive down when the mobile browser chrome retracts', () => {
    expect(getArchiveVisualViewportTop(730, 0, 206)).toBe(524);
  });

  it('includes the visual viewport offset when the visible area is panned', () => {
    expect(getArchiveVisualViewportTop(500, 100, 206)).toBe(394);
  });

  it('distributes five confetti bursts across the modal over three seconds', () => {
    const sequence = createModalConfettiSequence(() => 0.5);
    const uniquePositions = new Set(
      sequence.map(({ xRatio, yRatio }) => `${xRatio.toFixed(2)}:${yRatio.toFixed(2)}`),
    );

    expect(sequence).toHaveLength(5);
    expect(uniquePositions.size).toBe(5);
    expect(sequence.map(({ delay }) => delay)).toEqual(
      [...sequence.map(({ delay }) => delay)].sort((a, b) => a - b),
    );
    expect(sequence.every(({ delay }) => delay >= 0 && delay < 3000)).toBe(true);
    expect(
      sequence.every(
        ({ xRatio, yRatio }) =>
          xRatio >= 0.08 &&
          xRatio <= 0.92 &&
          yRatio >= 0.1 &&
          yRatio <= 0.9,
      ),
    ).toBe(true);
  });
});

describe('archive restick handle', () => {
  it('offers the gesture and its keyboard fallback when the label lives on this page', () => {
    const affordance = getArchiveRestickAffordance('Jean-Baptiste Kempf', true);

    expect(affordance.enabled).toBe(true);
    expect(affordance.ariaLabel).toContain('Recoller l’étiquette');
    expect(affordance.ariaLabel).toContain('Jean-Baptiste Kempf');
    expect(affordance.ariaLabel).toContain('Entrée ou Espace');
  });

  it('offers a free placement when the page holds no origin for that label', () => {
    const affordance = getArchiveRestickAffordance('FinOps, agents et dev tools', false);

    expect(affordance.enabled).toBe(true);
    expect(affordance.ariaLabel).toContain('Déposer l’étiquette');
    expect(affordance.ariaLabel).toContain('place au centre');
  });

  it('keeps a readable label when the archive card carries no name', () => {
    expect(getArchiveRestickAffordance('  ', true).ariaLabel).toContain('Recoller l’étiquette sur la page');
  });
});

describe('archive lift placement', () => {
  it('turns the lifted viewport position into document coordinates', () => {
    expect(createLiftPlacement({ x: 120, y: 80 }, { x: 0, y: 640 }, -2.4)).toEqual({
      x: 120,
      y: 720,
      rotation: -2.4,
      pinned: false,
    });
  });

  it('never pins a label taken out of the archive, its host is unknown until it lands', () => {
    expect(createLiftPlacement({ x: 0, y: 0 }, { x: 0, y: 0 }, 0).pinned).toBe(false);
  });
});
