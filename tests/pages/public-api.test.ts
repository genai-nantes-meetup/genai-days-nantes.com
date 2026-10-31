import { getCollection } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { GET as getSponsorsFr } from '../../src/pages/api/fr/sponsors.json';
import { GET as getSponsorsEn } from '../../src/pages/api/en/sponsors.json';
import { GET as getSpeakersFr } from '../../src/pages/api/fr/speakers.json';
import { GET as getSpeakersEn } from '../../src/pages/api/en/speakers.json';
import { GET as getSessionsFr } from '../../src/pages/api/fr/sessions.json';
import { GET as getSessionsEn } from '../../src/pages/api/en/sessions.json';
import { getPublicApiPath } from '../../src/lib/public-api';

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
    const speakers = await getCollection('speakers');
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

  it('serves every session with its speakers, translated per language', async () => {
    const sessions = await getCollection('sessions');
    const fr = await call(getSessionsFr, '/api/fr/sessions.json');
    const en = await call(getSessionsEn, '/api/en/sessions.json');

    expect(fr.json.talksLanguage).toBe('fr');
    expect(en.json.talksLanguage).toBe('fr');
    expect(fr.json.sessions).toHaveLength(sessions.length);

    const frEntry = fr.json.sessions.find((item: { id: string }) => item.id === 'agentic-coding');
    const enEntry = en.json.sessions.find((item: { id: string }) => item.id === 'agentic-coding');
    expect(frEntry.title).toBe('Plus je lui donne de context, moins il est bon');
    expect(enEntry.title).toBe('The more context I give it, the worse it gets');
    expect(frEntry.pageUrl).toBe('https://example.com/programme/agentic-coding');
    expect(enEntry.pageUrl).toBe('https://example.com/en/program/agentic-coding');
    expect(frEntry.room).toBeNull();

    const starts = fr.json.sessions.map((item: { startTime: string }) => item.startTime);
    expect([...starts].sort()).toEqual(starts);
  });
});
