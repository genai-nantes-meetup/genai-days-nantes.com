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
    expect(html.match(/href="\/programme"/g)).toHaveLength(1);
  });

  it('links each track name to its planning on the programme page', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(TracksProgramme);

    expect(html).toContain('href="/programme?parcours=dsi#planning"');
    expect(html).toContain('href="/programme?parcours=tech#planning"');
  });
});
