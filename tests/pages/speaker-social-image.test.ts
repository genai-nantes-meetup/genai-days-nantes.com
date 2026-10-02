import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import SpeakerPage from '../../src/pages/speakers/[speaker].astro';
import EVENT from '../../src/content/event.json';
import { createAstroContainer } from '../utils/create-astro-container';

afterEach(() => vi.unstubAllEnvs());

describe('speaker sharing images', () => {
  it('shares each speaker portrait in Open Graph and Twitter, with a poster fallback', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'genai-days-website.vercel.app');
    const speakers = await getCollection('speakers');
    const container = await createAstroContainer();
    const speakerWithoutPhoto = { ...speakers[0], data: { ...speakers[0].data, photo: undefined } };

    for (const speaker of [...speakers, speakerWithoutPhoto]) {
      const html = await container.renderToString(SpeakerPage, { props: { speaker, sessions: [] } });
      const document = new JSDOM(html).window.document;
      const expectedImage = new URL(speaker.data.photo ?? EVENT.image, 'https://genai-days-website.vercel.app').href;
      expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(expectedImage);
      expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(expectedImage);
    }
  });

  it('shares the same portrait from the English page, with an English alt text', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'genai-days-website.vercel.app');
    const speakers = await getCollection('speakers');
    const speaker = speakers.find((entry) => entry.data.photo);
    expect(speaker?.data.photo).toBeDefined();

    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakerPage, {
      props: { speaker, sessions: [] },
      request: new Request(`https://example.com/en/speakers/${speaker?.id}`),
    });
    const document = new JSDOM(html).window.document;

    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      new URL(speaker?.data.photo ?? '', 'https://genai-days-website.vercel.app').href,
    );
    expect(document.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBe(`Portrait of ${speaker?.data.name}`);
  });
});
