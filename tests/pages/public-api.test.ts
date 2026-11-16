import { getCollection } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { GET as getSponsorsFr } from '../../src/pages/api/fr/sponsors.json';
import { GET as getSponsorsEn } from '../../src/pages/api/en/sponsors.json';
import { GET as getSpeakersFr } from '../../src/pages/api/fr/speakers.json';
import { GET as getSpeakersEn } from '../../src/pages/api/en/speakers.json';
import { GET as getSessionsFr } from '../../src/pages/api/fr/sessions.json';
import { GET as getSessionsEn } from '../../src/pages/api/en/sessions.json';
import { getPublicApiPath } from '../../src/lib/public-api';
import { sortSpeakersByProminence } from '../../src/lib/speakers';
import { excludeUnlistedSpeakers, getUnlistedSpeakerIds, isUnlistedSession } from '../../src/lib/listing';

const getListedSpeakers = async () =>
  excludeUnlistedSpeakers(await getCollection('speakers'), await getCollection('sessions'));

const SITE = 'https://example.com/';

async function call(route: typeof getSponsorsFr, path: string) {
  const response = await route({ site: new URL(SITE), url: new URL(path, SITE) } as never);
  return { response, json: await response.json() };
}

describe('public JSON API', () => {
  it('maps resources to French root paths and English /en paths', () => {
    expect(getPublicApiPath('sponsors', 'fr')).toBe('/api/fr/sponsors.json');
    expect(getPublicApiPath('speakers', 'en')).toBe('/api/en/speakers.json');
  });

  it('serves every sponsor, platinum first, in both languages', async () => {
    const partners = await getCollection('partners');
    const fr = await call(getSponsorsFr, '/api/fr/sponsors.json');
    const en = await call(getSponsorsEn, '/api/en/sponsors.json');

    expect(fr.response.headers.get('content-type')).toContain('application/json');
    expect(fr.json.locale).toBe('fr');
    expect(en.json.locale).toBe('en');
    expect(fr.json.count).toBe(partners.length);
    expect(en.json.sponsors).toHaveLength(partners.length);

    const tiers = fr.json.sponsors.map((sponsor: { tier: string }) => sponsor.tier);
    const rank = ['platinum', 'gold', 'silver'];
    expect([...tiers].sort((a, b) => rank.indexOf(a) - rank.indexOf(b))).toEqual(tiers);

    const ippon = en.json.sponsors.find((sponsor: { id: string }) => sponsor.id === 'ippon');
    expect(ippon.description).toMatch(/technology consulting/);
    expect(ippon.logo).toMatch(/^https:\/\/example\.com\/logos\//);
    expect(ippon.pageUrl).toBe('https://example.com/en/partners');
  });

  it('serves every speaker with absolute localized URLs and their sessions', async () => {
    const speakers = await getListedSpeakers();
    const fr = await call(getSpeakersFr, '/api/fr/speakers.json');
    const en = await call(getSpeakersEn, '/api/en/speakers.json');

    expect(fr.json.speakers).toHaveLength(speakers.length);
    expect(en.json.speakers).toHaveLength(speakers.length);

    for (const speaker of speakers) {
      const frEntry = fr.json.speakers.find((item: { id: string }) => item.id === speaker.id);
      const enEntry = en.json.speakers.find((item: { id: string }) => item.id === speaker.id);
      expect(frEntry.name).toBe(speaker.data.name);
      expect(frEntry.pageUrl).toBe(`https://example.com/speakers/${speaker.id}`);
      expect(enEntry.pageUrl).toBe(`https://example.com/en/speakers/${speaker.id}`);
    }
  });

  it('orders speakers like the website, in both languages', async () => {
    const expected = sortSpeakersByProminence(await getListedSpeakers()).map((speaker) => speaker.id);
    const fr = await call(getSpeakersFr, '/api/fr/speakers.json');
    const en = await call(getSpeakersEn, '/api/en/speakers.json');

    expect(fr.json.speakers.map((item: { id: string }) => item.id)).toEqual(expected);
    expect(en.json.speakers.map((item: { id: string }) => item.id)).toEqual(expected);
  });

  it('serves every session with its speakers, translated per language', async () => {
    const sessions = await getCollection('sessions');
    const fr = await call(getSessionsFr, '/api/fr/sessions.json');
    const en = await call(getSessionsEn, '/api/en/sessions.json');

    expect(fr.json.talksLanguage).toBe('fr');
    expect(en.json.talksLanguage).toBe('fr');
    const isSession = (item: { kind: string }) => item.kind === 'session';
    expect(fr.json.sessions.filter(isSession).length).toBeGreaterThanOrEqual(sessions.length);

    const frEntry = fr.json.sessions.find((item: { id: string }) => item.id === 'agentic-coding');
    const enEntry = en.json.sessions.find((item: { id: string }) => item.id === 'agentic-coding');
    expect(frEntry.title).toBe('Mon agent ne répond jamais deux fois pareil');
    expect(enEntry.title).toBe('My agent never answers the same way twice');
    expect(frEntry.pageUrl).toBe('https://example.com/programme/agentic-coding');
    expect(enEntry.pageUrl).toBe('https://example.com/en/program/agentic-coding');
    expect(frEntry.quoteTitle).toBe(true);
    expect(fr.json.sessions.find((item: { id: string }) => item.id === 'podcast-maci').quoteTitle).toBe(false);
    expect(fr.json.sessions.every((item: { quoteTitle: unknown }) => typeof item.quoteTitle === 'boolean')).toBe(true);
    expect(frEntry.room).toBe('Salle Loire');
    expect(fr.json.sessions.find((item: { id: string }) => item.id === 'podcast-maci').room).toBe('Hémicycle');

    const starts = fr.json.sessions.map((item: { startTime: string }) => item.startTime);
    expect([...starts].sort()).toEqual(starts);
  });

  it('leaves backup sessions and the speakers who only give them out of every payload', async () => {
    const sessions = await getCollection('sessions');
    const unlistedSessionIds = sessions.filter(isUnlistedSession).map((session) => session.id);
    const unlistedSpeakerIds = [...getUnlistedSpeakerIds(sessions)];
    const speakersPayload = (await call(getSpeakersFr, '/api/fr/speakers.json')).json;
    const sessionsPayload = (await call(getSessionsFr, '/api/fr/sessions.json')).json;
    const servedSessionIds = [
      ...sessionsPayload.sessions.map((item: { id: string }) => item.id),
      ...speakersPayload.speakers.flatMap((item: { sessions: { id: string }[] }) => item.sessions.map((session) => session.id)),
    ];
    const servedSpeakerIds = speakersPayload.speakers.map((item: { id: string }) => item.id);

    for (const id of unlistedSessionIds) expect(servedSessionIds).not.toContain(id);
    for (const id of unlistedSpeakerIds) expect(servedSpeakerIds).not.toContain(id);
  });

  it('lists breaks, lunch and the closing keynote from the programme slots', async () => {
    const fr = await call(getSessionsFr, '/api/fr/sessions.json');
    const en = await call(getSessionsEn, '/api/en/sessions.json');
    type Entry = { id: string; kind: string; title: string; startTime: string; durationMinutes: number | null; pageUrl: string | null };
    const byId = (json: { sessions: Entry[] }, id: string) => json.sessions.find((item) => item.id === id);

    // The closing keynote runs in both track rooms at once: one entry per room.
    expect(byId(fr.json, 'keynote-1735')).toBeUndefined();
    expect(byId(fr.json, 'keynote-1735-decideurs')).toMatchObject({
      kind: 'session', startTime: '17:35', durationMinutes: 15, pageUrl: null,
      track: 'decideurs', room: 'Hémicycle', description: 'Avec Maxime Pitussi',
    });
    expect(byId(fr.json, 'keynote-1735-tech')).toMatchObject({
      track: 'tech', room: 'Salle Loire', description: 'Avec Samuel Berthe',
    });
    expect(byId(en.json, 'keynote-1735-tech')!.title).toBe('Closing keynote');

    expect(byId(fr.json, 'meal-1225')).toMatchObject({ kind: 'lunch', title: 'Déjeuner', durationMinutes: 80 });
    const breaks = fr.json.sessions.filter((item: Entry) => item.kind === 'break');
    expect(breaks.map((item: Entry) => item.startTime)).toEqual(['09:30', '11:00', '15:05', '16:40']);

    // The opening keynote is a collection session: no duplicate slot entry.
    expect(byId(fr.json, 'keynote-0915')).toBeUndefined();
  });
});
