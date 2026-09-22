const DEFAULT_DURATION = 1.645714;
const STALL_DELAY_MS = 56;
const MIN_PLAYBACK_RATE = 0.45;
const MAX_PLAYBACK_RATE = 3.6;

export interface PeelAudio {
  currentTime: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  preload: string;
  preservesPitch?: boolean;
  volume: number;
  load(): void;
  pause(): void;
  play(): Promise<void> | void;
}

export interface PeelSoundController {
  begin(progress: number, timestamp: number): void;
  update(progress: number, timestamp: number): void;
  complete(): void;
  rewind(): void;
  dispose(): void;
}

const PEEL_VOLUME = 0.35;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* Le MP3 ne sert qu'à un geste que la plupart des visiteurs ne font jamais :
 * son téléchargement attend que la page soit chargée et le fil libre, plutôt
 * que de concurrencer le rendu initial. preload="auto" reste posé dans le
 * markup, le fichier est donc prêt bien avant le premier tirage. */
function preloadWhenIdle(loadAudio: () => void): void {
  if (typeof window === 'undefined') {
    loadAudio();
    return;
  }

  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(loadAudio, { timeout: 2000 });
      return;
    }

    window.setTimeout(loadAudio, 200);
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}

export function getPeelSoundTime(
  progress: number,
  duration = DEFAULT_DURATION,
): number {
  return clamp(progress, 0, 1) * duration;
}

export function getPeelPlaybackRate(
  progressDelta: number,
  elapsedMs: number,
  duration = DEFAULT_DURATION,
): number {
  if (progressDelta <= 0 || elapsedMs <= 0) return MIN_PLAYBACK_RATE;

  const audioSeconds = progressDelta * duration;
  const gestureSeconds = elapsedMs / 1000;
  return clamp(audioSeconds / gestureSeconds, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
}

export function createPeelSoundController(audio: PeelAudio): PeelSoundController {
  let progress = 0;
  let lastTimestamp = 0;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  let stalled = true;
  let disposed = false;

  audio.preload = 'auto';
  audio.volume = PEEL_VOLUME;
  if (typeof audio.preservesPitch === 'boolean') audio.preservesPitch = false;
  preloadWhenIdle(() => {
    if (!disposed) audio.load();
  });

  const getDuration = () =>
    Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : DEFAULT_DURATION;

  const clearStallTimer = () => {
    if (!stallTimer) return;
    clearTimeout(stallTimer);
    stallTimer = undefined;
  };

  const seek = (nextProgress: number) => {
    try {
      audio.currentTime = getPeelSoundTime(nextProgress, getDuration());
    } catch {
      // Metadata can still be loading. The next gesture update will resync it.
    }
  };

  const pauseAt = (nextProgress: number) => {
    clearStallTimer();
    audio.pause();
    seek(nextProgress);
  };

  const play = () => {
    const playResult = audio.play();
    if (playResult && 'catch' in playResult) {
      void playResult.catch(() => {
        // Browsers can reject playback until a user gesture unlocks audio.
      });
    }
  };

  const scheduleStall = () => {
    clearStallTimer();
    stallTimer = setTimeout(() => {
      stallTimer = undefined;
      stalled = true;
      audio.pause();
      seek(progress);
    }, STALL_DELAY_MS);
  };

  return {
    begin(nextProgress, timestamp) {
      if (disposed) return;

      progress = clamp(nextProgress, 0, 1);
      lastTimestamp = timestamp;
      stalled = false;
      pauseAt(progress);

      // Unlock playback during the pointer gesture without making a sound.
      audio.volume = 0;
      play();
      scheduleStall();
    },

    update(nextProgress, timestamp) {
      if (disposed) return;

      const clampedProgress = clamp(nextProgress, 0, 1);
      const progressDelta = clampedProgress - progress;
      const elapsedMs = stalled ? 16 : Math.max(timestamp - lastTimestamp, 1);
      const duration = getDuration();
      const targetTime = getPeelSoundTime(clampedProgress, duration);

      progress = clampedProgress;
      lastTimestamp = timestamp;
      stalled = false;

      if (progressDelta <= 0.0005) {
        stalled = true;
        pauseAt(progress);
        return;
      }

      const playbackRate = getPeelPlaybackRate(progressDelta, elapsedMs, duration);
      const allowedDrift = Math.max(0.09, progressDelta * duration * 1.5);
      if (!Number.isFinite(audio.currentTime) || Math.abs(audio.currentTime - targetTime) > allowedDrift) {
        seek(progress);
      }

      audio.playbackRate = playbackRate;
      audio.volume = PEEL_VOLUME;
      play();
      scheduleStall();
    },

    complete() {
      if (disposed) return;
      progress = 1;
      stalled = true;
      pauseAt(progress);
    },

    rewind() {
      if (disposed) return;
      progress = 0;
      lastTimestamp = 0;
      stalled = true;
      pauseAt(0);
    },

    dispose() {
      if (disposed) return;
      pauseAt(0);
      disposed = true;
    },
  };
}
