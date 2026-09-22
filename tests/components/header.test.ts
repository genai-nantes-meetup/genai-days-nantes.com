import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Header from '../../src/components/Header.astro';

describe('Header.astro', () => {
  it('keeps ticketing as the only commercial action', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header);
    expect(html.match(/Réserver ma place/g)).toHaveLength(2);
    expect(html).not.toContain('147 € HT');
    expect(html.match(/bg-\[var\(--color-action-ticket\)\]/g)).toHaveLength(2);
    expect(html).not.toContain('Devenir partenaire');
    expect(html).not.toContain('data-contact-topic="partner"');
    expect(html).toContain('href="https://www.billetweb.fr/genai-days-nantes-2026"');
    expect(html).toContain('mobile-ticket-cta');
  });

  it('links pages only, each destination once, with annex pages in Explorer', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header);
    expect(html).not.toMatch(/href="\/?#/);
    expect(html).not.toContain('data-section-link');
    expect(html).not.toContain('Enjeux');
    for (const href of ['/programme', '/speakers', '/partenaires', '/infos-pratiques']) {
      // Une fois dans la barre desktop, une fois dans le menu mobile.
      expect(html.match(new RegExp(`href="${href}"`, 'g'))).toHaveLength(2);
    }
    expect(html).toContain('Explorer');
    for (const href of ['/press-kit', '/equipe', '/code-of-conduct']) {
      expect(html.match(new RegExp(`href="${href}"`, 'g'))).toHaveLength(1);
    }
    expect(html).toMatch(/href="https:\/\/naomakers\.com"[^>]*target="_blank"/);
    expect(html).toContain('ouvre un nouvel onglet');
  });

  it('marks the current page in the primary navigation', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, {
      request: new Request('https://example.com/programme/finops-agents-dev-tools'),
    });

    expect(html).toMatch(/href="\/programme"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/href="\/speakers"[^>]*aria-current="page"/);
  });

  it('stays sticky, surface driven by --header-surface, with the mobile menu panel', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header);
    expect(html).toContain('sticky');
    expect(html).toContain('site-header');
    expect(html).toMatch(/href="\/"[^>]*data-scroll-top/);
    expect(html).not.toContain('bg-white/95');
    expect(html).toContain('data-menu-toggle');
    expect(html).toContain('data-menu-panel');
    expect(html).toContain('data-menu-state="closed"');
    expect(html).toContain('data-menu-view="sections"');
    expect(html).toContain('data-menu-directory-open');
    expect(html).toContain('data-menu-directory-close');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(' inert');
  });

  it('marks both ticket actions for the immersive poster treatment', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, { props: { immersive: true } });

    expect(html.match(/header-cta--poster/g)).toHaveLength(1);
    expect(html.match(/mobile-ticket-cta--poster/g)).toHaveLength(1);
  });

  it('can remove ticketing from task-focused pages', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header, { props: { showTicketCta: false } });

    expect(html).not.toContain('Réserver ma place');
    expect(html).not.toContain('header-cta--tickets');
    expect(html).not.toContain('mobile-ticket-bar');
    expect(html).toContain('href="/press-kit"');
  });
});
