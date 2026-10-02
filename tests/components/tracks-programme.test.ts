import { describe, it, expect } from 'vitest';
import TracksProgramme from '../../src/components/TracksProgramme.astro';
import { createAstroContainer } from '../utils/create-astro-container';

describe('TracksProgramme.astro', () => {
  it('links to the programme right after the two tracks, before the day rhythm', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(TracksProgramme);
    const tracksIndex = html.indexOf('tracks-programme__tracks');
    const linkIndex = html.indexOf('tracks-programme__programme-link');
    const dayIndex = html.indexOf('Le rythme de la journée');

    expect(linkIndex).toBeGreaterThan(tracksIndex);
    expect(linkIndex).toBeLessThan(dayIndex);
    expect(html.match(/href="\/programme"/g)).toHaveLength(2);
  });

  it('identifies both tracks and links to the complete program', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(TracksProgramme);

    expect(html).toContain('data-track-mark="decideurs"');
    expect(html).toContain('data-track-mark="tech"');
    expect(html).toContain('Voir le programme complet');
  });

  it('renders the English tracks and links them to the English program', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(TracksProgramme, { request: new Request('https://example.com/en') });

    expect(html).toMatch(/Common ground\.<br[^>]*>Two tracks\./);
    expect(html).toContain('Those who decide');
    expect(html).toContain('href="/en/program"');
    expect(html).toContain('See the full program');
    expect(html).toContain('all delivered in French');
    expect(html).not.toContain('Le rythme de la journée');
    expect(html).not.toContain('href="/programme"');
  });
});
