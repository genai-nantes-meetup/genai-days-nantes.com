import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import InfosPratiquesPage from '../../src/pages/infos-pratiques.astro';
import EVENT from '../../src/content/event.json';

describe('infos-pratiques.astro', () => {
  it('publishes the complete route to the venue', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(InfosPratiquesPage);

    expect(html).toContain('<title>Infos pratiques');
    expect(html).toContain('Infos pratiques');
    expect(html).toContain(EVENT.venue.address);
    expect(html).toContain(`Rejoindre ${EVENT.venue.name}.`);
    expect(html).toContain(encodeURIComponent(EVENT.venue.name));
    expect(html).toContain(EVENT.startTime);
    expect(html).toContain('Calculer mon itinéraire');
    expect(html).toContain('Accès PMR');
    expect(html).toContain('Dormir à proximité');
    expect(html.match(/class="practical-section /g)).toHaveLength(3);
    expect(html).toContain('/images/hotel-region-banner-genai-days-optimized.webp');
  });

  it('exposes page and breadcrumb structured data', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(InfosPratiquesPage);

    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
  });

  it('renders the English page and says the talks are in French', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(InfosPratiquesPage, {
      request: new Request('https://example.com/en/practical-info'),
    });

    expect(html).toContain('<title>Practical info · GenAI Days</title>');
    expect(html).toContain('Talks are delivered in French.');
    expect(html).toContain(`Getting to the ${EVENT.venue.name}.`);
    expect(html).toContain(`${EVENT.venue.postalCode} ${EVENT.venue.city}.`);
    expect(html).toContain('Get directions');
    expect(html).toContain('Step-free access');
    expect(html).not.toContain('Calculer mon itinéraire');
    expect(html).toContain('"url":"https://example.com/en/practical-info","inLanguage":"en"');
    expect(html).toContain('"name":"Home","item":"https://example.com/en"');
  });
});
