import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BaseLayout from '../../src/layouts/BaseLayout.astro';

describe('BaseLayout.astro', () => {
  it('renders the title, meta description, canonical, and optional structured data', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'GenAI Days 2026 · Nantes, 17 novembre',
        description: "Journée-conférence sur l'intelligence artificielle à Nantes.",
        structuredData: [{ '@context': 'https://schema.org', '@type': 'Event', startDate: '2026-11-17T08:30:00+01:00' }],
      },
      slots: { default: '<p>contenu</p>' },
    });
    expect(html).toContain('<title>GenAI Days 2026 · Nantes, 17 novembre</title>');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/logos/Gen AI Logo.svg"');
    expect(html).toContain('rel="icon" href="/favicon.ico" sizes="any"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('rel="sitemap" href="/sitemap-index.xml"');
    expect(html).toContain('rel="alternate" type="text/plain" href="/llms.txt"');
    expect(html).toContain('name="description" content="Journée-conférence sur l\'intelligence artificielle à Nantes."');
    expect(html).toContain('name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('"startDate":"2026-11-17T08:30:00+01:00"');
    expect(html).toContain('property="og:image" content="https://example.com/images/cover_v2-optimized.webp"');
    expect(html).toContain('name="twitter:image" content="https://example.com/images/cover_v2-optimized.webp"');
    expect(html).toContain('name="twitter:image:alt" content="GENAI DAYS · 17 novembre 2026 · Nantes"');
    expect(html).toContain('data-contact-dialog');
    expect(html).toContain('aria-label="Préparer un message"');
    expect(html).toContain('aria-label="Copier le message"');
    expect(html).toContain('data-contact-copy="coordinate"');
    expect(html).not.toContain('La coordonnée apparaît uniquement');
    expect(html).not.toContain('mailto:');
    expect(html).not.toContain('data-label-shine-permission');
  });

  it('renders no JSON-LD when structuredData is omitted', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'Page introuvable · GenAI Days',
        description: 'Cette page n’existe pas.',
      },
      slots: { default: '<p>contenu</p>' },
    });
    expect(html).not.toContain('application/ld+json');
  });

  it('uses the page cover in both sharing formats without the default poster dimensions', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'Podcast MACI',
        description: 'Podcast en public.',
        socialImage: { src: '/talks/podcast-maci-clever-cloud-optimized.webp', alt: 'Pochette du podcast MACI' },
      },
    });

    expect(html).toContain('property="og:image" content="https://example.com/talks/podcast-maci-clever-cloud-optimized.webp"');
    expect(html).toContain('name="twitter:image" content="https://example.com/talks/podcast-maci-clever-cloud-optimized.webp"');
    expect(html).toContain('property="og:image:alt" content="Pochette du podcast MACI"');
    expect(html).toContain('name="twitter:image:alt" content="Pochette du podcast MACI"');
    expect(html).not.toContain('property="og:image:width"');
    expect(html).not.toContain('property="og:image:height"');
  });

  it('primes every internal page transition before the destination paints', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'Navigation entre les pages',
        description: 'Transition globale entre les pages du site.',
      },
      slots: { default: '<p>contenu</p>' },
    });

    expect(html).toContain("var storageKey = 'genaidays:page-transition:v1'");
    expect(html).toContain("document.documentElement.dataset.pageTransition = 'entering'");
    expect(html).toContain('html[data-page-transition=\'leaving\']::after');
    expect(html).toContain('inset: 0');
    expect(html).toContain('--page-transition-band-height');
    expect(html).toContain('radial-gradient(circle at 50% 95%');
    expect(html).not.toContain('header.classList.remove(\'is-immersed\')');
  });

  it('supports noindex on utility pages without blocking link discovery', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: 'Page utilitaire',
        description: 'Contenu réservé à un parcours secondaire.',
        robots: 'noindex, follow, noarchive',
      },
      slots: { default: '<p>contenu</p>' },
    });

    expect(html).toContain('name="robots" content="noindex, follow, noarchive"');
  });
});
