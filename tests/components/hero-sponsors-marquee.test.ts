import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HeroAffiche from '../../src/components/HeroAffiche.astro';
import HeroSponsorsMarquee from '../../src/components/HeroSponsorsMarquee.astro';

describe('HeroSponsorsMarquee.astro', () => {
  it('scrolls every sponsor tier but leaves the co-organizer on the sticker', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroSponsorsMarquee);
    const primary = html.slice(html.indexOf('data-marquee-copy="primary"'), html.indexOf('data-marquee-copy="duplicate"'));

    expect(html).toContain('aria-label="Partenaires"');
    expect(primary).toContain('alt="Logo Clever Cloud"');
    expect(primary).toContain('alt="Logo Ippon"');
    expect(primary).toContain('alt="Logo Jems"');
    expect(html).not.toContain('Logo Région Pays de la Loire');
    expect(primary).toContain('alt="Logo Externatic"');
  });

  it('duplicates the logo group for a seamless loop, hidden from assistive tech', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroSponsorsMarquee);

    expect(html).toMatch(/data-marquee-copy="duplicate"/);
    expect(html).toMatch(/aria-hidden="true"[^>]*data-marquee-copy="duplicate"|data-marquee-copy="duplicate"[^>]*aria-hidden="true"/);
  });

  it('sits under the ticket CTA in the hero', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/hero-affiche__cta[\s\S]*hero-affiche__sponsors[\s\S]*aria-label="Partenaires"/);
    expect(html).toContain('aria-label="Co-organisé avec la Région Pays de la Loire"');
  });
});
