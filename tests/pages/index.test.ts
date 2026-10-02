import { describe, expect, it } from 'vitest';
import IndexPage from '../../src/pages/index.astro';
import { createAstroContainer } from '../utils/create-astro-container';

async function renderHome(url: string) {
  const container = await createAstroContainer();
  const html = await container.renderToString(IndexPage, { request: new Request(url) });
  const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
  const findNode = (type: string) => structuredData.find((node) => node['@type'] === type);

  return { html, event: findNode('Event'), website: findNode('WebSite') };
}

describe('index.astro', () => {
  it('serves the English landing page, with English SEO and links, at /en', async () => {
    const { html, event, website } = await renderHome('https://example.com/en');

    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<title>GENAI DAYS 2026 · Generative AI conference in Nantes');
    expect(html).toMatch(/<meta name="description" content="A one-day generative AI conference[^"]*Talks are delivered in French\."/);
    expect(html).toContain('From theory to practice.');
    expect(html).toMatch(/href="\/en\/speakers\/[a-z-]+"/);
    expect(html).not.toContain('Du discours au terrain.');
    expect(event.description).toContain('Talks are delivered in French.');
    expect(event.description).toContain('Co-organized with the Région Pays de la Loire');
    expect(event.organizer[0].name).toBe('Naomakers');
    expect(event.organizer[1].name).toBe('Région Pays de la Loire');
    expect(event.inLanguage).toBe('fr');
    expect(event.url).toBe('https://example.com/en');
    expect(event.performer[0].url).toMatch(/^https:\/\/example\.com\/en\/speakers\/[a-z-]+$/);
    expect(website.inLanguage).toBe('en');
  });

  it('keeps the French landing page and its structured data on the French URLs', async () => {
    const { html, event, website } = await renderHome('https://example.com/');

    expect(html).toContain('<html lang="fr"');
    expect(html).toContain('Du discours au terrain.');
    expect(event.url).toBe('https://example.com/');
    expect(event.performer[0].url).toMatch(/^https:\/\/example\.com\/speakers\/[a-z-]+$/);
    expect(website.inLanguage).toBe('fr');
    expect(event.description).toContain('Co-organisée avec la Région Pays de la Loire');
  });
});
