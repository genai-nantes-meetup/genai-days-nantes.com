import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CodeOfConductPage from '../../src/pages/code-of-conduct.astro';

describe('code-of-conduct.astro', () => {
  it('renders the French code of conduct with its reporting contact', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CodeOfConductPage);

    expect(html).toContain('<title>Code of conduct · GenAI Days</title>');
    expect(html).toContain('Signaler un incident');
    expect(html).toContain('mailto:hello@genai-days-nantes.com');
  });

  it('renders the English version', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CodeOfConductPage, {
      request: new Request('https://example.com/en/code-of-conduct'),
    });

    expect(html).toContain('<html lang="en"');
    expect(html).toContain('Reporting an incident');
    expect(html).toMatch(/<span lang="fr"[^>]*>Équipe/);
    expect(html).toContain('mailto:hello@genai-days-nantes.com');
    expect(html).not.toContain('Signaler un incident');
  });
});
