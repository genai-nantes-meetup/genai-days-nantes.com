// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clear,
  clearPlacement,
  collect,
  getCollected,
  getPlacement,
  getRewardRegistration,
  hasCollectedEvery,
  hasSeenCompletionModal,
  isCollected,
  markCompletionModalSeen,
  saveRewardRegistration,
  setPlacement,
  uncollect,
} from '../../src/lib/label-collection';

describe('label-collection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('archives each cover label once', () => {
    collect('session-piloter-transformation-dsi');
    collect('session-piloter-transformation-dsi');

    expect(getCollected()).toEqual(['session-piloter-transformation-dsi']);
    expect(isCollected('session-piloter-transformation-dsi')).toBe(true);
  });

  it('persists a believable restuck position and clears it on archival', () => {
    const placement = {
      x: 42,
      y: 84,
      xAnchor: 'right' as const,
      yAnchor: 'top' as const,
      xOffset: 64,
      yOffset: 96,
      rotation: -2.4,
      pinned: true,
    };
    setPlacement('session-piloter-transformation-dsi', placement);
    expect(getPlacement('session-piloter-transformation-dsi')).toEqual(placement);

    collect('session-piloter-transformation-dsi');
    expect(getPlacement('session-piloter-transformation-dsi')).toBeUndefined();
  });

  it('can clear one placement or the whole local archive', () => {
    setPlacement('session-a', { x: 1, y: 2, rotation: 0 });
    clearPlacement('session-a');
    expect(getPlacement('session-a')).toBeUndefined();

    collect('session-a');
    clear();
    expect(getCollected()).toEqual([]);
  });

  it('takes a label back out of the archive and onto the page in one write', () => {
    collect('session-a');
    collect('session-b');

    const placement = { x: 120, y: 360, rotation: -2.1, pinned: false };
    expect(uncollect('session-a', placement)).toBe(true);

    expect(getCollected()).toEqual(['session-b']);
    expect(isCollected('session-a')).toBe(false);
    expect(getPlacement('session-a')).toEqual(placement);
  });

  it('sends a label back to its original slot when no placement is given', () => {
    setPlacement('session-a', { x: 10, y: 20, rotation: 0 });
    collect('session-a');

    expect(uncollect('session-a')).toBe(true);
    expect(getCollected()).toEqual([]);
    expect(getPlacement('session-a')).toBeUndefined();
  });

  it('stays harmless on a label that was never collected', () => {
    collect('session-b');

    expect(uncollect('session-a')).toBe(true);
    expect(getCollected()).toEqual(['session-b']);
    expect(getPlacement('session-a')).toBeUndefined();
  });

  it('reports a refused write so the gesture can be undone', () => {
    collect('session-a');
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('storage is full');
    });

    expect(uncollect('session-a', { x: 1, y: 2, rotation: 0 })).toBe(false);

    vi.restoreAllMocks();
    expect(isCollected('session-a')).toBe(true);
    expect(getPlacement('session-a')).toBeUndefined();
  });

  it('unlocks the reward only when every expected label is collected', () => {
    collect('landing-day-manifesto');
    expect(hasCollectedEvery(['landing-day-manifesto', 'session-a'])).toBe(false);

    collect('session-a');
    expect(hasCollectedEvery(['landing-day-manifesto', 'session-a'])).toBe(true);
  });

  it('remembers the completion modal and only keeps the winner first name locally', () => {
    expect(hasSeenCompletionModal()).toBe(false);
    markCompletionModalSeen();
    saveRewardRegistration('  Camille  ');

    expect(hasSeenCompletionModal()).toBe(true);
    expect(getRewardRegistration()).toMatchObject({ firstName: 'Camille' });
  });

  it('clears reward access when the archive is reset', () => {
    saveRewardRegistration('Camille');
    clear();

    expect(getRewardRegistration()).toBeUndefined();
    expect(hasSeenCompletionModal()).toBe(false);
  });
});
