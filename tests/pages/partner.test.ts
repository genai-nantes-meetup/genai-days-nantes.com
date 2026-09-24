import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PartnersIndexPage from '../../src/pages/partenaires.astro';

describe('partner directory', () => {
  it('links confirmed partners directly to their official websites', async () => {
    const confirmedPartners = (await getCollection('partners')).sort((a, b) => a.data.order - b.data.order);
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnersIndexPage);

    expect(confirmedPartners).toHaveLength(16);
    expect(html).toContain('partner-board__group--with-coorganizer');
    expect(html).toContain('partner-tile--coorganizer');
    expect(html).toContain('La Région Pays de la Loire co-organise cette édition à l’Hôtel de Région');

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
});
