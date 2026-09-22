import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PartnersShowcase from '../../src/components/PartnersShowcase.astro';

describe('PartnersShowcase.astro', () => {
  it('keeps the co-organizer fixed while the other partners fill two continuous rows', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnersShowcase);

    expect(html).toContain('Ils rendent la journée possible.');
    expect(html).toContain('aria-label="Aperçu des partenaires"');
    expect(html).toContain('data-partner-layout="two-rows"');
    expect(html.match(/data-marquee-row/g)).toHaveLength(2);
    expect(html).toContain('data-partner-emphasis="platinum"');
    expect(html).toContain('data-partner-emphasis="remaining"');
    expect(html.match(/data-marquee-copy="primary"/g)).toHaveLength(2);
    expect(html.match(/data-marquee-copy="duplicate"/g)).toHaveLength(2);
    expect(html.match(/data-partner-logo=/g)).toHaveLength(13);
    expect(html).toContain('class="partner-showcase__coorganizer"');
    expect(html).toContain(
      'La Région Pays de la Loire co-organise cette édition et nous ouvre les portes de l’Hôtel de Région',
    );
    expect(html).toContain('alt="Logo Région Pays de la Loire"');
    expect(html).toContain('alt="Logo ADN Ouest"');
    expect(html).toContain('alt="Logo Clever Cloud"');
    expect(html).toContain('alt="Logo Club des ETI"');
    expect(html).toContain('alt="Logo Ippon"');
    expect(html).toContain('alt="Logo AlphaEdge"');
    expect(html).toContain('alt="Logo Elastic"');
    expect(html).toContain('alt="Logo Techtown"');
    expect(html).toContain('alt="Logo Swiftask"');
    expect(html).toContain('alt="Logo Jems"');
    expect(html).toContain('alt="Logo Cross Data"');
    expect(html).toContain('alt="Logo _icilundi"');
    expect(html).toContain('alt="Logo Externatic"');
    expect(html).not.toContain('alt="Logo SII"');
    expect(html).not.toContain('alt="Logo Mistral AI"');
    expect(html).not.toContain('alt="Logo NVIDIA"');
  });

  it('links every logo to its official website and keeps duplicates out of the tab order', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PartnersShowcase);

    expect(html).toContain('href="https://www.paysdelaloire.fr"');
    expect(html).toContain('href="https://www.adnouest.org"');
    expect(html).toContain('href="https://www.clever.cloud"');
    expect(html).toContain('href="https://www.clubetipaysdelaloire.com/"');
    expect(html).toContain('href="https://fr.ippon.tech/"');
    expect(html).toContain('href="https://alphaedge-ai.com/"');
    expect(html).toContain('href="https://www.elastic.co/"');
    expect(html).toContain('href="https://techtown.fr/"');
    expect(html).toContain('href="https://swiftask.ai/"');
    expect(html).toContain('href="https://www.jems-group.com/fr/"');
    expect(html).toContain('href="https://www.crossdata.tech/"');
    expect(html).toContain('href="https://icilundi.fr/"');
    expect(html).toContain('href="https://www.externatic.fr/"');
    expect(html).not.toContain('href="https://sii-group.com/"');
    expect(html).toContain('aria-label="Visiter le site de Région Pays de la Loire"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html.match(/tabindex="-1"/g)).toHaveLength(13);
    expect(html).toContain('href="/partenaires"');
    expect(html).toContain('Découvrir tous les partenaires');
  });
});
