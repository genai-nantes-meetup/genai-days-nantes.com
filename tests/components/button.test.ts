import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Button from '../../src/components/Button.astro';

describe('Button.astro', () => {
  it('renders an anchor with the given href and slot content', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
      props: { variant: 'primary', href: 'https://tickets.example.com' },
      slots: { default: 'Réserver sa place' },
    });
    expect(html).toContain('href="https://tickets.example.com"');
    expect(html).toContain('Réserver sa place');
    expect(html).toContain('bg-brand-blue');
  });

  it('appends a trailing arrow only for the tertiary variant', async () => {
    const container = await AstroContainer.create();
    const tertiaryHtml = await container.renderToString(Button, {
      props: { variant: 'tertiary', href: '#planning' },
      slots: { default: 'Voir le programme' },
    });
    const primaryHtml = await container.renderToString(Button, {
      props: { variant: 'primary', href: '#tickets' },
      slots: { default: 'Réserver sa place' },
    });
    expect(tertiaryHtml).toContain('class="arrow-icon"');
    expect(tertiaryHtml).toContain('d="M3 12h17M14 6l6 6-6 6"');
    expect(primaryHtml).not.toContain('class="arrow-icon"');
  });

  it('renders contact actions as buttons without a public destination', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Button, {
      props: { variant: 'primary', contact: 'press' },
      slots: { default: 'Contacter la presse' },
    });

    expect(html).toContain('<button');
    expect(html).toContain('data-contact-topic="press"');
    expect(html).not.toContain('href=');
  });
});
