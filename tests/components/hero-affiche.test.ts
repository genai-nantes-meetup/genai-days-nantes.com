import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HeroAffiche from '../../src/components/HeroAffiche.astro';

describe('HeroAffiche.astro', () => {
  it('renders the full-bleed poster with the proposition and no competing CTA', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);
    expect(html).toContain('hero-affiche');
    expect(html).toContain('src="/images/cover_v2-optimized.webp"');
    expect(html).toContain('L’IA générative');
    expect(html).toContain('est déjà chez vous.');
    expect(html).toContain('C’est maintenant');
    expect(html).toContain('que ça se complique.');
    expect(html).not.toContain('placeholder-billetterie');
    expect(html).not.toContain('Prendre mon ticket');
    expect(html).toContain('data-poster-trame');
    expect(html).not.toContain('places limitées');
  });

  it('carries the event facts on the peelable identity sticker', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);
    expect(html).toContain('MARDI · ACCUEIL 08:30');
    expect(html).toContain('CONFÉRENCES');
    expect(html).toMatch(/<strong[^>]*>17<\/strong>/);
    expect(html).toMatch(/<b[^>]*>novembre<\/b>/);
    expect(html).toContain('Hôtel de Région');
    expect(html).not.toContain('Hôtel de Région Pays de la Loire');
    expect(html).toContain('Nantes');
    expect(html.match(/data-label-id="landing-day-manifesto"/g)).toHaveLength(1);
    expect(html).not.toContain('event-name');
  });

  it('pins the label to the poster above the reading scrims', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/hero-affiche__poster[\s\S]*hero-affiche__scrim-top[\s\S]*data-poster-label[\s\S]*data-label-pin-host/);
    expect(html).not.toContain('data-poster-scene');
    expect(html).not.toContain('hero-affiche__manifeste-scrim');
    expect(html).not.toContain('data-label-obstacle');
  });

  it('keeps a typographic relay of the sticker facts for when it is collected', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/hero-affiche__practical[\s\S]*MARDI 17 novembre 2026[\s\S]*Hôtel de Région, Nantes[\s\S]*ACCUEIL 08:30/);
    expect(html).toContain('hero-affiche__coorganizer--relay');
  });
});
