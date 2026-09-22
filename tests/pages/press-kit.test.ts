import { describe, expect, it } from 'vitest';
import PressKitPage from '../../src/pages/press-kit.astro';
import { createAstroContainer } from '../utils/create-astro-container';

describe('press-kit.astro', () => {
  it('renders a compact press dossier around the journalist workflow', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PressKitPage);

    expect(html).toContain('<title>Espace presse 2026 · GenAI Days</title>');
    expect(html).toContain('contentUrl":"https://example.com/images/cover_v2-optimized.webp"');
    expect(html).toContain('En bref.');
    expect(html).toContain('Trois angles pour raconter l’événement.');
    expect(html).toContain('À télécharger.');
    expect(html).toContain('Pour une interview.');
    expect(html).toContain('Une question ou une accréditation');
    expect(html).toContain('class="directory-hero"');
    expect(html).not.toContain('L’IA, ici et maintenant');
    expect(html).not.toContain('L’équipe organisatrice');
    expect(html).not.toContain('Les repères factuels');
    expect(html).not.toContain('Réserver ma place');
    expect(html).not.toContain('mobile-ticket-bar');
  });

  it('exposes copy-ready presentation and factual information', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PressKitPage);

    expect(html).toContain('id="press-summary"');
    expect(html).toContain('data-copy-target="press-summary"');
    expect(html).toContain('id="press-facts-copy"');
    expect(html).toContain('data-copy-target="press-facts-copy"');
    expect(html).toContain('Présentation prête à publier · 93 mots');
    expect(html).toContain('Fiche factuelle.');
    expect(html).toContain('href="/programme"');
    expect(html).not.toContain('data-copy-target="press-hashtag"');
    expect(html).not.toContain('#GenAIDaysNantes');
  });

  it('describes and exposes the downloadable media package', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PressKitPage);

    expect(html).toContain('ZIP · 1,9 Mo · 12 fichiers');
    expect(html).toContain('README, visuel officiel, symbole vectoriel et neuf portraits');
    expect(html).toContain('href="/press/genai-days-press-kit.zip"');
    expect(html).toContain('href="/press/genai-days-press-kit/cover_v2-optimized.webp"');
    expect(html).toContain('href="/logos/Gen AI Logo.svg"');
    expect(html).toContain('WEBP · 2560 × 1454 px · Crédit');
    expect(html).toContain('Proportions et couleurs du symbole à respecter');
    expect(html).not.toContain('EB Garamond Variable');
    expect(html).not.toContain('Palette et règles d’usage');
  });

  it('keeps only press spokespeople and protects the dedicated contact', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(PressKitPage);

    expect(html).toContain('Samuel Berthe');
    expect(html).toContain('Aymeric de Maussion');
    expect(html).toContain('Open source, communauté technique et organisation de l’événement.');
    expect(html).toContain('Écosystème régional, adoption de l’IA et dynamiques territoriales.');
    expect(html).toContain('src="/organisateurs/samuel-berthe.webp"');
    expect(html).not.toContain('Maxime Pitussi');
    expect(html).not.toContain('Simon Timssale');
    expect(html).not.toContain('Hugo Rémusat');
    expect(html).not.toContain('Judie Boulissiere');
    expect(html).not.toContain('Dorian Ouvrard');
    expect(html).not.toContain('Rémi Wetteren');
    expect(html).not.toContain('Emilie Blum');
    expect(html.match(/Demander une interview/g)).toHaveLength(2);
    expect(html).toContain('data-contact-topic="press"');
    expect(html).not.toContain('Afficher et copier les coordonnées');
    expect(html).not.toContain('mailto:');
    expect(html).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});
