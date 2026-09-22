import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import SessionPage from '../../src/pages/programme/[session].astro';
import EVENT from '../../src/content/event.json';
import { createAstroContainer } from '../utils/create-astro-container';

afterEach(() => vi.unstubAllEnvs());

describe('session sharing images', () => {
  it('shares each session cover consistently in Open Graph, Twitter and JSON-LD, with a poster fallback', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'genai-days-website.vercel.app');
    const sessions = await getCollection('sessions');
    const container = await createAstroContainer();
    const sessionWithoutCover = { ...sessions[0], data: { ...sessions[0].data, illustration: undefined } };

    for (const session of [...sessions, sessionWithoutCover]) {
      const html = await container.renderToString(SessionPage, { props: { session, speakers: [] } });
      const document = new JSDOM(html).window.document;
      const expectedImage = new URL(session.data.illustration?.src ?? EVENT.image, 'https://genai-days-website.vercel.app').href;
      expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(expectedImage);
      expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(expectedImage);
      const event = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
      expect(event.image).toEqual([expectedImage]);
    }
  });
});
