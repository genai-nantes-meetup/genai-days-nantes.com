import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ContactPage from '../../src/pages/contact.astro';

describe('contact.astro', () => {
  it('renders a dedicated contact page with the site layout', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactPage);

    expect(html).toContain('<title>Contact · GenAI Days</title>');
    expect(html).toContain('id="contact-title"');
    expect(html).toContain('Une question sur l’événement');
    expect(html).toContain('Devenir partenaire');
    expect(html).toContain('Presse et médias');
  });

  it('uses the shared directory hero and its optimized banner', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactPage);

    expect(html).toContain('directory-hero');
    expect(html).toContain('/images/chateau-nantes-miroir-eau-banner-genai-days-optimized.webp');
    expect(html).not.toContain('image-placeholder');
  });

  it('routes each request to the appropriate contact', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactPage);
    const contactSection = html.match(/<section class="contact-paths"[\s\S]*?<\/section>/)?.[0];

    expect(contactSection).toBeDefined();
    expect(contactSection?.match(/data-contact-topic="general"/g)).toHaveLength(1);
    expect(contactSection).not.toContain('data-contact-topic="partner"');
    expect(contactSection).not.toContain('data-contact-topic="press"');
    expect(contactSection).toContain('href="/partenaires#devenir-partenaire"');
    expect(contactSection).toContain('href="/press-kit#contact-presse"');
    expect(contactSection).toContain('Voir les partenariats');
    expect(contactSection).toContain('Accéder à l’espace presse');
    expect(contactSection).not.toContain('mailto:');
    expect(contactSection).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it('links to the most useful self-service pages', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactPage);

    expect(html).toContain('href="/partenaires#devenir-partenaire"');
    expect(html).toContain('href="/press-kit#contact-presse"');
    expect(html).toContain('"@type":"ContactPage"');
  });
});
