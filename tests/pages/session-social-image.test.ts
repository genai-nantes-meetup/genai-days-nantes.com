import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import SessionPage from '../../src/pages/programme/[session].astro';
import EVENT from '../../src/content/event.json';
import { getSessionPagePaths } from '../../src/lib/programme';
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

  it('keeps the same image on the English session page and localizes its copy, links and JSON-LD', async () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'genai-days-website.vercel.app');
    const path = (await getSessionPagePaths()).find(
      ({ props }) => props.session.data.quoteTitle && props.speakers.length > 0 && props.nextSession,
    );
    if (!path) throw new Error('no quoted session with speakers and a next session');
    const { session, speakers, nextSession } = path.props;
    const container = await createAstroContainer();
    const html = await container.renderToString(SessionPage, {
      props: path.props,
      request: new Request(`https://example.com/en/program/${session.id}`),
    });
    const document = new JSDOM(html).window.document;
    const expectedImage = new URL(session.data.illustration?.src ?? EVENT.image, 'https://genai-days-website.vercel.app').href;
    const [event, breadcrumb] = [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) =>
      JSON.parse(script.textContent!),
    );
    const languageTerm = [...document.querySelectorAll('.session-facts dt')].find((term) => term.textContent === 'Language');

    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(expectedImage);
    expect(event.url).toBe(`https://example.com/en/program/${session.id}`);
    expect(event.inLanguage).toBe('fr');
    expect(event.performer[0].url).toBe(`https://example.com/en/speakers/${speakers[0].id}`);
    expect(breadcrumb.itemListElement[1]).toMatchObject({ name: 'Program', item: 'https://example.com/en/program' });
    expect(languageTerm?.nextElementSibling?.textContent).toBe('French');
    expect(document.querySelector('.session-title')?.textContent?.trim()).toMatch(/^“[^"]+”$/);
    expect(document.querySelector('.session-back-link')?.getAttribute('href')).toBe('/en/program');
    expect(document.querySelector(`a[href="/en/speakers/${speakers[0].id}"]`)).not.toBeNull();
    expect(document.querySelector(`a[href="/en/program/${nextSession!.id}"]`)).not.toBeNull();
    expect(html).not.toContain('Tout le programme');
  });
});
