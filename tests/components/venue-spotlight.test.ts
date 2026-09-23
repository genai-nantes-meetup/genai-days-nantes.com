import { describe, expect, it } from 'vitest';
import VenueSpotlight from '../../src/components/VenueSpotlight.astro';
import { EVENT, formatEventDateLabel } from '../../src/lib/event';
import { createAstroContainer } from '../utils/create-astro-container';

describe('VenueSpotlight.astro', () => {
  it('presents the venue and its access details', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(VenueSpotlight);

    expect(html).toContain('Au bord de la Loire, au cœur de Nantes.');
    expect(html).toContain(EVENT.venue.shortName);
    expect(html).toContain(formatEventDateLabel());
    expect(html).toContain(EVENT.venue.address);
    expect(html).toContain('accueille les conférences, les rencontres et les temps communs');
    expect(html).toMatch(/class="venue-spotlight__visual"[^>]*>\s*<picture/);
    expect(html).toContain('data-venue-map');
    expect(html).toContain('Entrée côté rue de la Loire');
    expect(html).toContain('Busway 5 · arrêt Pompidou');
    expect(html).toContain('Parking du parc de Beaulieu');
    expect(html).toContain('https://www.google.com/maps/dir/');
    expect(html).toContain('href="/infos-pratiques"');
  });
});
