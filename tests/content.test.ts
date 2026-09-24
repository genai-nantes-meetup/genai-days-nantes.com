import { describe, it, expect } from 'vitest';
import { getCollection } from 'astro:content';
import { PARTNER_TIER_CAPACITIES } from '../src/lib/partners';

describe('content collections', () => {
  it('defines exactly the dirigeants and tech tracks', async () => {
    const tracks = await getCollection('tracks');
    expect(tracks.map((track) => track.id).sort()).toEqual(['decideurs', 'tech']);
    expect(tracks.find((track) => track.id === 'decideurs')?.data.name).toBe('Pour ceux qui décident');
    expect(tracks.find((track) => track.id === 'tech')?.data.name).toBe('Pour ceux qui implémentent');
    expect(tracks.find((track) => track.id === 'decideurs')?.data.shortName).toBe('Ceux qui décident');
    expect(tracks.find((track) => track.id === 'tech')?.data.shortName).toBe('Ceux qui implémentent');
  });

  it('contains only confirmed speakers', async () => {
    const speakers = await getCollection('speakers');

    expect(speakers).toHaveLength(9);
    expect(speakers.map((speaker) => speaker.data.name).sort()).toEqual([
      'Christelle Morançais',
      'Constance Nebbula',
      'Florian Hervéou',
      'Jean-Baptiste Kempf',
      'Nicolas Martignole',
      'Quentin Adam',
      'Sébastien Le Corfec',
      'Thomas Mathieu',
      'Théo Hubert',
    ]);
    expect(speakers.find((speaker) => speaker.id === 'nicolas-martignole')?.data.company).toBe('Back Market');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.company).toBe('VLC · Scaleway · Kyber');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.companyLogo).toBe('/logos/kyber.svg');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.companyLogoAlt).toBe('Logo Kyber');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.company).toBe('Clever Cloud');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.photo).toBe('/speakers/quentin-adam-optimized.webp');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.companyLogo).toBe('/logos/clever-cloud.svg');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.website).toBe('https://www.clever.cloud/');
    expect(speakers.find((speaker) => speaker.id === 'constance-nebbula')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'sebastien-le-corfec')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'thomas-mathieu')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'florian-herveou')?.data.eventRole).toBe('animateur');
  });

  it('gives every speaker a detailed profile, career landmarks and associated companies', async () => {
    const speakers = await getCollection('speakers');

    for (const speaker of speakers) {
      expect(speaker.data.profile.length).toBeGreaterThanOrEqual(2);
      expect(speaker.data.genaiLegitimacy.length).toBeGreaterThan(180);
      expect(speaker.data.careerHighlights.length).toBeGreaterThanOrEqual(2);
      expect(speaker.data.companies.length).toBeGreaterThanOrEqual(1);

      for (const company of speaker.data.companies) {
        expect(company.relationship.length).toBeGreaterThan(4);
        expect(company.description.length).toBeGreaterThan(80);
        expect(company.website).toMatch(/^https:\/\//);
      }
    }

    const jeanBaptiste = speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf');
    expect(jeanBaptiste?.data.companies.map((company) => company.name)).toEqual([
      'VideoLAN et VLC',
      'Scaleway',
      'Kyber',
    ]);
  });

  it('places the four confirmed organizations among the Platinum partners', async () => {
    const partners = await getCollection('partners');
    const platinum = partners.filter((partner) => partner.data.tier === 'platinum');
    expect(platinum.map((partner) => partner.data.name).sort()).toEqual([
      'ADN Ouest',
      'Clever Cloud',
      'Région Pays de la Loire',
      'Swiftask',
    ]);
  });

  it('keeps partner tiers within their capacity', async () => {
    const partners = await getCollection('partners');
    expect(partners.filter((partner) => partner.data.tier === 'platinum').length).toBeLessThanOrEqual(
      PARTNER_TIER_CAPACITIES.platinum,
    );
    expect(partners.filter((partner) => partner.data.tier === 'gold').length).toBeLessThanOrEqual(
      PARTNER_TIER_CAPACITIES.gold,
    );
  });

  it('contains only confirmed partners with official websites', async () => {
    const partners = await getCollection('partners');
    const orders = partners.map((partner) => partner.data.order);

    expect(partners).toHaveLength(16);
    expect(new Set(orders).size).toBe(partners.length);
    expect(partners.every((partner) => new URL(partner.data.website).hostname !== 'example.com')).toBe(true);
  });

  it('every published session references confirmed speaker slugs', async () => {
    const sessions = await getCollection('sessions');
    const speakers = await getCollection('speakers');
    const speakerIds = new Set(speakers.map((speaker) => speaker.id));

    for (const session of sessions) {
      for (const slug of session.data.speakerSlugs) {
        expect(speakerIds.has(slug)).toBe(true);
      }
    }
  });

  it('publishes the confirmed FinOps session at 15:55 on the dirigeants track', async () => {
    const sessions = await getCollection('sessions');

    const finopsSession = sessions.find((session) => session.id === 'finops-agents-dev-tools');

    expect(finopsSession?.data.startTime).toBe('15:55');
    expect(finopsSession?.data.durationMinutes).toBe(40);
    expect(finopsSession?.data.track).toBe('decideurs');
    expect(finopsSession?.data.illustration?.src).toBe('/talks/stage-1-talk-8-finops-optimized.webp');

    const startupContest = sessions.find((session) => session.id === 'startup-contest');
    expect(startupContest?.data.startTime).toBe('13:45');
    expect(startupContest?.data.track).toBe('decideurs');
    expect(startupContest?.data.format).toBe('concours');
    expect(startupContest?.data.speakerSlugs).toEqual([
      'constance-nebbula',
      'sebastien-le-corfec',
      'thomas-mathieu',
      'florian-herveou',
    ]);
  });
});
