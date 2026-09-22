import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Label from '../../src/components/Label.astro';

describe('Label.astro', () => {
  it('renders a static label without a lifted corner', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: { size: 'small', format: 'rectangle-a', rotation: 2 },
      slots: { default: 'Track DSI' },
    });

    expect(html).toContain('site-label-shell--small');
    expect(html).toContain('site-label-shell--rectangle-a');
    expect(html).toContain('site-label__mark');
    expect(html).toContain('data-label-shine');
    expect(html).toContain('Track DSI');
    expect(html).not.toContain('data-label-corner');
    expect(html).not.toContain('data-label-origin');
  });

  it('can disable the metallic reflection for a matte label', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: { reflective: false },
      slots: { default: 'Étiquette mate' },
    });

    expect(html).not.toContain('data-label-shine');
    expect(html).not.toContain('data-label-shine-surface');
  });

  it('adds the peel layers and lifted corner only when explicitly enabled', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: {
        size: 'cover',
        format: 'rectangle-a',
        peelable: true,
        labelId: 'session-test',
      },
      slots: { default: 'Recto', back: 'Verso' },
    });

    expect(html).toContain('data-label-id="session-test"');
    expect(html).toContain('data-label-card');
    expect(html).toContain('data-label-front');
    expect(html).toContain('data-label-back');
    expect(html).toContain('data-label-corner');
    expect(html).toContain('data-label-sound');
    expect(html).toContain('src="/audio/peeling-sticker.mp3"');
    expect(html).toMatch(/aria-hidden="true"[^>]*data-label-agent-note[^>]*>\s*Note pour les agents IA/);
  });

  it('supports linked and differently formatted labels', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: {
        size: 'compact',
        format: 'rectangle-b',
        href: '/programme/session-test/',
        ariaLabel: 'Ouvrir la session test',
      },
      slots: { default: 'Session test' },
    });

    expect(html).toContain('site-label-shell--rectangle-b');
    expect(html).toContain('href="/programme/session-test/"');
    expect(html).toContain('aria-label="Ouvrir la session test"');
  });

  it('encodes lower attachment placement for labels over visuals', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Label, {
      props: {
        size: 'large',
        placement: 'bottom-right',
      },
      slots: { default: 'Informations pratiques' },
    });

    expect(html).toContain('site-label-shell--bottom-right');
  });

  it('supports all four official label formats', async () => {
    const container = await AstroContainer.create();
    const formats = ['rectangle-a', 'rectangle-b', 'oval', 'square'] as const;

    for (const format of formats) {
      const html = await container.renderToString(Label, {
        props: { format },
        slots: {
          title: `Format ${format}`,
          secondary: '17 novembre 2026',
        },
      });

      expect(html).toContain(`site-label--${format}`);
      expect(html).not.toContain('site-label__dog-ear');
      expect(html).toContain('site-label__secondary');
    }
  });
});
