import type { ImageMetadata } from 'astro';

// Astro resolves every file under src/assets/speakers/ into optimizable image
// metadata at build time. Eager + glob keys the result by filename, so pages can
// look a portrait up by the speaker's content-collection id without a per-speaker
// import statement.
const portraitModules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/speakers/*', {
  eager: true,
});

const SPEAKER_PORTRAITS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(portraitModules).map(([path, mod]) => [
    path.replace(/^.*\//, '').replace(/\.[^./]+$/, ''),
    mod.default,
  ]),
);

export function getSpeakerPortrait(speakerId: string): ImageMetadata | undefined {
  return SPEAKER_PORTRAITS[speakerId];
}

/* Responsive steps clamped to the portrait's own resolution, so a small source
 * (e.g. a 400x400 headshot) never asks Astro to upscale past its native size.
 * 480 covers the mobile card width, 800 the widest desktop card; the portrait's
 * own width is always included as the top step. */
export function getSpeakerPortraitWidths(portrait: ImageMetadata): number[] {
  return [...new Set([480, 800, portrait.width].filter((width) => width <= portrait.width))].sort(
    (a, b) => a - b,
  );
}
