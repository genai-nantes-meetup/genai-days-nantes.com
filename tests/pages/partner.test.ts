import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PartnersIndexPage from '../../src/pages/partenaires.astro';

describe('partner directory', () => {
  it('links confirmed partners directly to their official websites', async () => {
    const confirmedPartners = (await getCollection('partners')).sort((a, b) => a.data.order - b.data.order);
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnersIndexPage);

    expect(confirmedPartners.length).toBeGreaterThan(0);
    expect(html).toContain('partner-board__group--with-coorganizer');
    expect(html).toContain('partner-tile--coorganizer');
    expect(html).toContain('La Région Pays de la Loire soutient cette édition et l’accueille à l’Hôtel de Région');

    confirmedPartners.forEach((partner) => {
      expect(html).toContain(`href="${partner.data.website}"`);
      expect(html).toContain(`aria-label="Visiter le site de ${partner.data.name}"`);
      expect(html).not.toContain(`href="/partenaires/${partner.id}"`);
    });

    expect(html.match(/target="_blank"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(html.match(/rel="noopener noreferrer"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(html).not.toContain('Groupe Atlantide');
    expect(html).not.toContain('Loire Data Works');
    expect(html).not.toContain('Nautilus AI');
  });

  it('renders the English directory under /en/partners with the same anchors', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnersIndexPage, {
      request: new Request('https://example.com/en/partners'),
    });
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

    expect(html).toContain('<title>Partners · GENAI DAYS · with support from the Région Pays de la Loire</title>');
    expect(main).toContain('at the Hôtel de Région, alongside committed companies and networks.');
    expect(main).toContain('aria-label="Visit the Clever Cloud website"');
    expect(main).toContain('Want your organization to take part in the day?');
    expect(main).toContain('id="devenir-partenaire"');
    expect(main).not.toContain('Devenir partenaire');
    expect(html).toContain('"url":"https://example.com/en/partners","inLanguage":"en"');
    expect(html).toContain('{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com/en"}');
  });
});
