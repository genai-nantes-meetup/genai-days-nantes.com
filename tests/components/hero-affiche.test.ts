import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HeroAffiche from '../../src/components/HeroAffiche.astro';

describe('HeroAffiche.astro', () => {
  it('renders the full-bleed poster with the proposition and a single ticket CTA', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);
    expect(html).toContain('hero-affiche');
    expect(html).toContain('src="/images/cover_v2-optimized.webp"');
    expect(html).toContain('LA Conf Gen AI dédiée aux décideurs et leurs équipes techs');
    expect(html).toContain('2 tracks pour décider où investir et comprendre comment déployer');
    expect(html).not.toContain('placeholder-billetterie');
    expect(html).toMatch(/hero-affiche__cta[\s\S]*href="https:\/\/www\.billetweb\.fr\/genai-days-nantes-2026"[\s\S]*Réserver ma place[\s\S]*hero-affiche__sponsors/);
    expect(html).not.toContain('Prendre mon ticket');
    expect(html).toContain('data-poster-trame');
    expect(html).not.toContain('places limitées');
  });

  it('carries the event facts on the peelable identity sticker', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);
    const label = html.slice(html.indexOf('data-poster-label'), html.indexOf('data-label-pin-host'));
    expect(label).not.toContain('ACCUEIL');
    expect(label).not.toContain('CONFÉRENCES');
    expect(html).toMatch(/<strong[^>]*>17<\/strong>/);
    expect(html).toMatch(/<b[^>]*>novembre<\/b>/);
    expect(html).toContain('Hôtel de Région');
    expect(label).not.toContain('Hôtel de Région Pays de la Loire');
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

  it('always shows the practical line under the title', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HeroAffiche);

    expect(html).toMatch(/hero-affiche__practical[\s\S]*MARDI 17 novembre 2026[\s\S]*Hôtel de Région, Nantes[\s\S]*\+\u00a0400 PARTICIPANTS/);
    expect(html).toContain('hero-affiche__coorganizer--relay');
  });
});
