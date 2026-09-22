import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import LabelArchive from '../../src/components/LabelArchive.astro';

describe('LabelArchive.astro', () => {
  it('renders one collection containing regular and programme labels', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LabelArchive);

    expect(html).toContain('aria-label="Collection d’étiquettes"');
    expect(html).toMatch(/<span[^>]*>COLLECTION<\/span>/);
    expect(html).toContain('Vider la collection');
    expect(html).toContain('Collection vide.');
    expect(html).toContain('data-label-id="landing-day-manifesto"');
    expect(html).toContain('data-label-id="speaker-jean-baptiste-kempf"');
    expect(html).toContain('data-label-id="session-finops-agents-dev-tools"');
    expect(html).toContain('data-session-start="15:55"');
    expect(html).toContain('data-my-day-choice-marker');
    expect(html).toContain('data-label-restick-template');
    expect(html).toContain('site-label--cover');
    expect(html).not.toContain('CLASSEUR / ÉTIQUETTES');
    expect(html).not.toContain('GENAI DAYS · NANTES');
    expect(html).not.toContain('data-label-archive-view');
    expect(html).not.toContain('data-my-day-total');
  });

  it('keeps collection, reward and close controls available', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LabelArchive);

    expect(html).toContain('data-label-dropzone');
    expect(html).toContain('data-label-archive-close');
    expect(html).toContain('data-label-archive-reset');
    expect(html).toContain('data-label-shine-permission');
    expect(html).toContain('data-label-completion-modal');
    expect(html).toContain('data-label-archive-reward');
    expect(html).toContain('COLLECTION COMPLÈTE');
    expect(html).not.toContain('data-label-archive-progress');
  });

  it('gives every collected label a restick handle', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(LabelArchive);
    const handles = html.match(/data-label-archive-restick/g) ?? [];
    const items = html.match(/data-label-archive-item/g) ?? [];

    expect(handles).toHaveLength(items.length);
    expect(html).toContain('data-label-restick-name="Accueil · Manifeste"');
    expect(html).toContain('data-label-restick-name="Jean-Baptiste Kempf"');
  });
});
