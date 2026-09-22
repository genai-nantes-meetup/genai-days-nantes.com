import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import NotFoundPage from '../../src/pages/404.astro';

describe('404.astro', () => {
  it('renders a clean branded recovery page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(NotFoundPage);

    expect(html).toContain('<title>Page introuvable · GenAI Days</title>');
    expect(html).toContain('Cette page n’est pas au programme.');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/programme"');
    expect(html).toContain('bg-brand-blue');
    expect(html).toContain('17 novembre 2026');
  });
});
