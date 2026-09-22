import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPeelSoundController,
  getPeelPlaybackRate,
  getPeelSoundTime,
  type PeelAudio,
} from '../../src/scripts/peel-sound';

class FakeAudio implements PeelAudio {
  currentTime = 0;
  duration = 1.6;
  paused = true;
  playbackRate = 1;
  preload = '';
  preservesPitch = true;
  volume = 1;
  loadCalls = 0;
  pauseCalls = 0;
  playCalls = 0;

  load() {
    this.loadCalls += 1;
  }

  pause() {
    this.paused = true;
    this.pauseCalls += 1;
  }

  play() {
    this.paused = false;
    this.playCalls += 1;
    return Promise.resolve();
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('peel sound timing', () => {
  it('maps the peel percentage to the same percentage of the audio file', () => {
    expect(getPeelSoundTime(0.5, 1.6)).toBeCloseTo(0.8);
    expect(getPeelSoundTime(2, 1.6)).toBe(1.6);
    expect(getPeelSoundTime(-1, 1.6)).toBe(0);
  });

  it('adapts playback speed to gesture speed', () => {
    expect(getPeelPlaybackRate(0.1, 100, 1.6)).toBeCloseTo(1.6);
    expect(getPeelPlaybackRate(0.8, 20, 1.6)).toBe(3.6);
    expect(getPeelPlaybackRate(0.001, 1000, 1.6)).toBe(0.45);
  });

  it('pauses exactly at the current percentage when movement stalls', () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    const controller = createPeelSoundController(audio);

    controller.begin(0, 0);
    controller.update(0.5, 500);
    vi.advanceTimersByTime(56);

    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBeCloseTo(0.8);
  });

  it('rewinds silently when progress goes backwards or the label is restuck', () => {
    const audio = new FakeAudio();
    const controller = createPeelSoundController(audio);

    controller.begin(0, 0);
    controller.update(0.6, 300);
    const playCalls = audio.playCalls;
    controller.update(0.25, 500);

    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBeCloseTo(0.4);
    expect(audio.playCalls).toBe(playCalls);

    controller.rewind();
    expect(audio.currentTime).toBe(0);
  });

  it('uses the resumed gesture speed instead of the time spent paused', () => {
    vi.useFakeTimers();
    const audio = new FakeAudio();
    const controller = createPeelSoundController(audio);

    controller.begin(0, 0);
    controller.update(0.5, 500);
    vi.advanceTimersByTime(56);
    controller.update(0.6, 2000);

    expect(audio.playbackRate).toBe(3.6);
    expect(audio.paused).toBe(false);
  });
});
