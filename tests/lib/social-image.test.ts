import { afterEach, describe, expect, it, vi } from 'vitest';
import EVENT from '../../src/content/event.json';
import { getSocialImageUrl } from '../../src/lib/social-image';

const SITE_URL = EVENT.url;

afterEach(() => vi.unstubAllEnvs());

describe('getSocialImageUrl', () => {
  it('uses the public Vercel production domain, not a protected deployment or the future canonical domain', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'genai-days-website.vercel.app');
    vi.stubEnv('VERCEL_URL', 'protected-preview.vercel.app');
    expect(getSocialImageUrl('/talks/cover-optimized.webp', SITE_URL))
      .toBe('https://genai-days-website.vercel.app/talks/cover-optimized.webp');
  });

  it('falls back to the site outside Vercel and preserves absolute image URLs', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', undefined);
    expect(getSocialImageUrl('images/cover-optimized.webp', SITE_URL))
      .toBe(SITE_URL + '/images/cover-optimized.webp');
    expect(getSocialImageUrl('https://cdn.example.com/cover-optimized.jpg', SITE_URL))
      .toBe('https://cdn.example.com/cover-optimized.jpg');
  });
});
