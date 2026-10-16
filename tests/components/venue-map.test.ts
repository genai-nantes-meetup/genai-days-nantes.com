import { describe, expect, it } from 'vitest';
import VenueMap from '../../src/components/VenueMap.astro';
import { createAstroContainer } from '../utils/create-astro-container';

describe('VenueMap.astro', () => {
  it('renders the map canvas and directions link in French', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(VenueMap);

    expect(html).toContain('data-venue-map');
    expect(html).toContain('Plan d’accès');
    expect(html).toContain('Entrée côté rue de la Loire');
    expect(html).toContain('https://www.google.com/maps/dir/');
  });

  it('renders the map in English on English pages', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(VenueMap, { request: new Request('https://example.com/en/practical-info') });

    expect(html).toContain('Location map');
    expect(html).toContain('Entrance on Rue de la Loire');
    expect(html).not.toContain('Plan d’accès');
  });
});
