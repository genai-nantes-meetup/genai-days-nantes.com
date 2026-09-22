import { describe, it, expect } from 'vitest';
import { toISODateTime, formatEventDateLabel, buildEventJsonLd } from '../../src/lib/event';
import EVENT from '../../src/content/event.json';

const SITE_URL = EVENT.url;

describe('EVENT', () => {
  it('exposes the confirmed date, hours, and venue', () => {
    expect(EVENT.date).toBe('2026-11-17');
    expect(EVENT.startTime).toBe('08:30');
    expect(EVENT.endTime).toBe('22:00');
    expect(EVENT.venue.name).toBe('Hôtel de Région Pays de la Loire');
    expect(EVENT.venue.city).toBe('Nantes');
  });
});

describe('toISODateTime', () => {
  it('builds a timezone-aware ISO datetime for JSON-LD', () => {
    expect(toISODateTime(EVENT.startTime)).toBe('2026-11-17T08:30:00+01:00');
    expect(toISODateTime(EVENT.endTime)).toBe('2026-11-17T22:00:00+01:00');
  });
});

describe('formatEventDateLabel', () => {
  it('formats the date in French for display', () => {
    expect(formatEventDateLabel()).toBe('17 novembre 2026');
  });
});

describe('buildEventJsonLd', () => {
  it('produces a schema.org Event with correct dates, venue, and ticket offer', async () => {
    const jsonLd = (await buildEventJsonLd(SITE_URL + '/', 'https://billetterie.genaidays.fr/edition-2026')) as any;
    expect(jsonLd['@type']).toBe('Event');
    expect(jsonLd['@id']).toBe(SITE_URL + '/#event');
    expect(jsonLd.startDate).toBe('2026-11-17T08:30:00+01:00');
    expect(jsonLd.endDate).toBe('2026-11-17T22:00:00+01:00');
    expect(jsonLd.location.name).toBe('Hôtel de Région Pays de la Loire');
    expect(jsonLd.offers.url).toBe('https://billetterie.genaidays.fr/edition-2026');
    expect(jsonLd.offers.price).toBe(147);
    expect(jsonLd.offers.priceCurrency).toBe('EUR');
    expect(jsonLd).not.toHaveProperty('aggregateRating');
  });

  it('lists every organizer, including a co-organizer, with a stable @id for the primary one', async () => {
    const jsonLd = (await buildEventJsonLd(SITE_URL + '/', 'https://billetterie.genaidays.fr/edition-2026')) as any;
    const organizers = Array.isArray(jsonLd.organizer) ? jsonLd.organizer : [jsonLd.organizer];
    const primary = organizers.find((org: any) => org.name === 'Naomakers');
    expect(primary).toBeDefined();
    expect(primary['@id']).toBe(SITE_URL + '/#organizer');
  });

  it('declares only social profiles that have a URL', async () => {
    const jsonLd = (await buildEventJsonLd(SITE_URL + '/', 'https://billetterie.genaidays.fr/edition-2026')) as any;
    expect(jsonLd.sameAs).toContain('https://www.linkedin.com/company/generative-ai-nantes/');
    expect(jsonLd.sameAs).toContain('https://x.com/GenAINantes');
    expect(jsonLd.sameAs).not.toContain('');
  });

  it('does not publish a placeholder ticket offer', async () => {
    const jsonLd = await buildEventJsonLd(
      SITE_URL + '/',
      'https://placeholder-billetterie.example.com/genai-days-2026',
    );

    expect(jsonLd).not.toHaveProperty('offers');
  });
});
