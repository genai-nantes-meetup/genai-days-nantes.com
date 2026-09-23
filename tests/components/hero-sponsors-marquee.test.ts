import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HeroAffiche from '../../src/components/HeroAffiche.astro';
import HeroSponsorsMarquee from '../../src/components/HeroSponsorsMarquee.astro';

describe('HeroSponsorsMarquee.astro', () => {
  it('includes every sponsor tier and adds the co-organizer to the mobile rail', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroSponsorsMarquee);
    const primary = html.slice(html.indexOf('data-marquee-copy="primary"'), html.indexOf('data-marquee-copy="duplicate"'));

    expect(html).toContain('aria-label="Partenaires"');
    expect(primary).toContain('alt="Logo Clever Cloud"');
    expect(primary).toContain('alt="Logo Ippon"');
    expect(primary).toContain('alt="Logo Jems"');
    expect(primary).toContain('alt="Logo Région Pays de la Loire"');
    expect(primary).toContain('hero-sponsors__logo--coorganizer');
    expect(primary).toContain('alt="Logo Externatic"');
  });

  it('duplicates the logo group for a seamless loop, hidden from assistive tech', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroSponsorsMarquee);

    expect(html).toMatch(/data-marquee-copy="duplicate"/);
    expect(html).toMatch(/aria-hidden="true"[^>]*data-marquee-copy="duplicate"|data-marquee-copy="duplicate"[^>]*aria-hidden="true"/);
    expect(html).toContain('data-logo-marquee-toggle');
    expect(html).toContain('aria-pressed="false"');
    expect(primaryLinkCount(html)).toBeGreaterThan(0);
    expect(html).toContain('tabindex="-1"');
  });

  it('sits under the ticket CTA in the hero', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/hero-affiche__cta[\s\S]*hero-affiche__sponsors[\s\S]*aria-label="Partenaires"/);
    expect(html).toContain('aria-label="Co-organisé avec la Région Pays de la Loire"');
  });
});

function primaryLinkCount(html: string) {
  const primary = html.slice(html.indexOf('data-marquee-copy="primary"'), html.indexOf('data-marquee-copy="duplicate"'));
  return (primary.match(/aria-label="Visiter le site de /g) ?? []).length;
}
