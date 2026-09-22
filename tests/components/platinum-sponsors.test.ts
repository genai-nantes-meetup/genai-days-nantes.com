import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HeroAffiche from '../../src/components/HeroAffiche.astro';
import PartnersShowcase from '../../src/components/PartnersShowcase.astro';
import PlatinumSponsors from '../../src/components/PlatinumSponsors.astro';

describe('PlatinumSponsors.astro', () => {
  it('keeps the co-organizer separate from the four Platinum partner logos', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PlatinumSponsors);

    expect(html).toContain('aria-label="Partenaires Platinum"');
    expect(html).not.toContain('<h3');
    expect(html.match(/<li/g)).toHaveLength(4);
    expect(html).not.toContain('Logo Région Pays de la Loire');
    expect(html).toContain('alt="Logo Clever Cloud"');
    expect(html).toContain('alt="Logo Swiftask"');
    expect(html).toContain('alt="Logo ADN Ouest"');
    expect(html).toContain('alt="Logo SII"');
    expect(html).toContain('src="/logos/adn-ouest.png"');
    expect(html).toContain('src="/logos/SII_white-optimized.svg"');
  });

  it('keeps the Platinum logos attached to the scrolling hero title', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/data-poster-label[\s\S]*hero-affiche__label-partner[\s\S]*data-hero-title[\s\S]*hero-affiche__sponsors/);
    expect(html).not.toContain('data-intro-chrome');
    expect(html).toContain('aria-label="Partenaires Platinum"');
    expect(html).toContain('aria-label="Co-organisé avec la Région Pays de la Loire"');
    expect(html).not.toContain('hero-affiche__credit-caption');
    expect(html).toContain('src="/logos/region-pays-de-la-loire-optimized.webp"');
  });

  it('matches the Platinum row in the partners showcase', async () => {
    const container = await AstroContainer.create();
    const heroHtml = await container.renderToString(PlatinumSponsors);
    const showcaseHtml = await container.renderToString(PartnersShowcase);
    const heroPartners = [...heroHtml.matchAll(/alt="Logo ([^"]+)"/g)].map((match) => match[1]);
    const showcasePartners = [...showcaseHtml.matchAll(/data-partner-logo="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(showcasePartners.slice(0, heroPartners.length)).toEqual(heroPartners);
  });
});
