import { describe, it, expect } from 'vitest';
import { getCollection } from 'astro:content';
import { PARTNER_TIER_CAPACITIES } from '../src/lib/partners';
import { PROGRAMME_SLOTS } from '../src/lib/programme';

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

    expect(speakers.length).toBeGreaterThan(0);
    expect(new Set(speakers.map((speaker) => speaker.data.name)).size).toBe(speakers.length);
    expect(speakers.every((speaker) => !speaker.data.name.includes('À venir'))).toBe(true);
    expect(speakers.find((speaker) => speaker.id === 'nicolas-martignole')?.data.company).toBe('Back Market');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.company).toBe('VLC · Scaleway · Kyber');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.companyLogo).toBe('/logos/kyber.svg');
    expect(speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf')?.data.companyLogoAlt).toBe('Logo Kyber');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.company).toBe('Clever Cloud');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.photo).toBe('/speakers/quentin-adam-optimized.webp');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.companyLogo).toBe('/logos/clever-cloud-optimized.png');
    expect(speakers.find((speaker) => speaker.id === 'quentin-adam')?.data.website).toBe('https://www.clever.cloud/');
    expect(speakers.find((speaker) => speaker.id === 'constance-nebbula')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'sebastien-le-corfec')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'thomas-mathieu')?.data.eventRole).toBe('jury');
    expect(speakers.find((speaker) => speaker.id === 'florian-herveou')?.data.eventRole).toBe('animateur');
    expect(speakers.find((speaker) => speaker.id === 'jaafar-steiblen-raji')?.data.eventRole).toBe('monsieur-loyal');
    expect(speakers.find((speaker) => speaker.id === 'annabelle-koster')?.data.eventRole).toBe('madame-loyale');
  });

  it('gives every speaker a detailed profile, career landmarks and associated companies', async () => {
    const speakers = await getCollection('speakers');

    for (const speaker of speakers) {
      expect(speaker.data.profile.length).toBeGreaterThanOrEqual(2);
      expect(speaker.data.genaiLegitimacy.length).toBeGreaterThan(180);
      expect(speaker.data.careerHighlights.length).toBeGreaterThanOrEqual(2);

      for (const company of speaker.data.companies ?? []) {
        expect(company.relationship.length).toBeGreaterThan(4);
        expect(company.description.trim().length).toBeGreaterThan(0);
        expect(company.website).toMatch(/^https:\/\//);
      }
    }

    const jeanBaptiste = speakers.find((speaker) => speaker.id === 'jean-baptiste-kempf');
    expect(jeanBaptiste?.data.companies?.map((company) => company.name)).toEqual([
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

    expect(partners).toHaveLength(17);
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

  it('publishes the confirmed FinOps session and Startup Contest on the decision track', async () => {
    const sessions = await getCollection('sessions');

    const finopsSession = sessions.find((session) => session.id === 'finops-agents');

    expect(finopsSession?.data.startTime).toBe('13:45');
    expect(finopsSession?.data.durationMinutes).toBe(40);
    expect(finopsSession?.data.track).toBe('decideurs');
    expect(finopsSession?.data.illustration?.src).toBe('/talks/stage-1-talk-8-finops-optimized.webp');

    const startupContest = sessions.find((session) => session.id === 'startup-contest');
    expect(startupContest?.data.startTime).toBe('11:55');
    expect(startupContest?.data.track).toBe('decideurs');
    expect(startupContest?.data.format).toBe('concours');
    expect(startupContest?.data.speakerSlugs).toEqual([
      'constance-nebbula',
      'sebastien-le-corfec',
      'thomas-mathieu',
      'david-leaurant',
      'florian-herveou',
    ]);
  });

  it('keeps announced sessions on scheduled slots without overlapping a session on the same track', async () => {
    const sessions = await getCollection('sessions');
    const minutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const slots = new Set(PROGRAMME_SLOTS.map((slot) => slot.time));
    for (const session of sessions) {
      expect(slots.has(session.data.startTime), session.id).toBe(true);
      const start = minutes(session.data.startTime);
      const end = start + session.data.durationMinutes;
      const overlaps = sessions.filter((other) => other.id !== session.id
        && other.data.track === session.data.track
        && minutes(other.data.startTime) < end
        && minutes(other.data.startTime) + other.data.durationMinutes > start);
      expect(overlaps, session.id).toEqual([]);
    }
    PROGRAMME_SLOTS.forEach((slot, index) => {
      const next = PROGRAMME_SLOTS[index + 1];
      if (next && slot.durationMinutes) {
        expect(minutes(slot.time) + slot.durationMinutes, slot.time).toBeLessThanOrEqual(minutes(next.time));
      }
    });
  });

  /* Garde-fou de la double maintenance FR/EN (AGENTS.md) : un seul
   * invariant pour toutes les collections, pas un test par entrée. */
  it('gives every translatable entry its English version', async () => {
    const pairs = [
      ['sessions', 'sessionsEn'],
      ['speakers', 'speakersEn'],
      ['tracks', 'tracksEn'],
      ['team', 'teamEn'],
      ['partners', 'partnersEn'],
    ] as const;

    for (const [collection, translations] of pairs) {
      const frenchIds = (await getCollection(collection)).map((entry) => entry.id).sort();
      const englishIds = (await getCollection(translations)).map((entry) => entry.id).sort();
      expect(englishIds, translations).toEqual(frenchIds);
    }

    const englishSpeakers = new Map((await getCollection('speakersEn')).map((entry) => [entry.id, entry.data]));
    for (const speaker of await getCollection('speakers')) {
      expect(englishSpeakers.get(speaker.id)?.companies?.length, speaker.id).toBe(speaker.data.companies?.length);
    }

    const englishSessions = new Map((await getCollection('sessionsEn')).map((entry) => [entry.id, entry]));
    for (const session of await getCollection('sessions')) {
      const english = englishSessions.get(session.id);
      expect(Boolean(english?.body?.trim()), session.id).toBe(Boolean(session.body?.trim()));
      expect(Boolean(english?.data.illustration), session.id).toBe(Boolean(session.data.illustration));
    }
  });
});
