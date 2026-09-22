import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Footer from '../../src/components/Footer.astro';

describe('Footer.astro', () => {
  it('links to the published pages', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);
    expect(html).toContain('site-footer');
    expect(html).toMatch(/href="\/"[^>]*data-scroll-top/);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/speakers"');
    expect(html).toContain('href="/partenaires"');
    expect(html).toContain('href="/infos-pratiques"');
    expect(html).toContain('href="/press-kit"');
    expect(html).toContain('href="/confidentialite"');
    expect(html).toContain('href="/llms.txt"');
    expect(html).toContain('rel="alternate" type="text/plain"');
    expect(html).not.toContain('/a-propos');
    expect(html).toContain('Confidentialité et mentions légales');
  });

  it('links the event social profiles in new tabs', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);
    expect(html).toMatch(/href="https:\/\/www\.linkedin\.com\/company\/generative-ai-nantes\/"[^>]*target="_blank"/);
    expect(html).toContain('aria-label="LinkedIn, ouvre un nouvel onglet"');
    expect(html).toMatch(/href="https:\/\/x\.com\/GenAINantes"[^>]*target="_blank"/);
    expect(html).toContain('aria-label="X, ouvre un nouvel onglet"');
  });

  it('links partner enquiries to the dedicated page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);
    expect(html).toContain('href="/partenaires#devenir-partenaire"');
    expect(html).not.toContain('mailto:');
  });

  it('closes the page with a filtered Nantes cityscape', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);
    expect(html).toContain('/images/affiche-chateau-nantes-1600.webp');
    expect(html).toContain('data-footer-coda');
    expect(html).toContain('site-footer__frame');
    expect(html).not.toContain('data-footer-trame');
    expect(html).not.toContain('on passe au terrain.');
    expect(html).not.toContain('site-footer__closing-mark');
  });
});
