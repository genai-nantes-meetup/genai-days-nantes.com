import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PrivacyPage from '../../src/pages/confidentialite.astro';

describe('confidentialite.astro', () => {
  it('renders the required publisher and hosting information', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PrivacyPage);

    expect(html).toContain('<title>Confidentialité &amp; Mentions légales · GenAI Days</title>');
    expect(html).toContain('Naomakers');
    expect(html).toContain('W442026186');
    expect(html).toContain('901 264 374 00025');
    expect(html).toContain('Rémi Wetteren');
    expect(html).toContain('hello@genai-days-nantes.com');
    expect(html).toContain('Rémi Wetteren');
    expect(html).toContain('Vercel Inc.');
    expect(html).toContain('440 N Barranca Avenue #4133');
  });

  it('documents every data flow and how visitors can exercise their rights', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PrivacyPage);

    expect(html).toContain('id="donnees-personnelles"');
    expect(html).toContain('Inscription à la récompense des stickers');
    expect(html).toContain('Plus Five Five, Inc., sous la marque Resend');
    expect(html).toContain('Google LLC');
    expect(html).toContain('genaidays:label-archive:v5');
    expect(html).toContain('genai-days:shiny-permission');
    expect(html).toContain('OpenFreeMap');
    expect(html).toContain('https://www.cnil.fr/fr/plaintes');
    expect(html).toContain('mailto:hello@genai-days-nantes.com');
    expect(html).toContain('Préparer ma demande');
  });

  it('states that the site does not use advertising or advertising trackers', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PrivacyPage);

    expect(html).toContain('ne diffuse aucune publicité');
    expect(html).toContain('ne dépose aucun traceur publicitaire');
  });

  it('renders the English translation and defers to the French version', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(PrivacyPage, {
      request: new Request('https://example.com/en/privacy'),
    });

    expect(html).toContain('<title>Privacy &amp; legal notice · GenAI Days</title>');
    expect(html).toContain('shows no advertising');
    expect(html).toContain('the French version prevails');
    expect(html).toContain('href="/confidentialite" hreflang="fr"');
    expect(html).toContain('id="donnees-personnelles"');
    expect(html).toContain('href="#donnees-personnelles"');
    expect(html).toContain('genaidays:label-archive:v5');
    expect(html).not.toContain('ne diffuse aucune publicité');
  });
});
