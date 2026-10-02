import { getCollection, getEntry } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { getLocalizedCollection, localizeEntry } from '../../src/lib/localized-content';

describe('localized content', () => {
  it('serves the French entries untouched', async () => {
    expect(await getLocalizedCollection('sessions', 'fr')).toEqual(await getCollection('sessions'));
  });

  it('lays the English fields over the French entry and keeps the shared ones', async () => {
    const session = (await getCollection('sessions')).find((entry) => entry.data.illustration?.src && entry.body?.trim());
    if (!session) throw new Error('no illustrated session with a body');
    const english = await getEntry('sessionsEn', session.id);
    const localized = await localizeEntry(session, 'en');

    expect(localized.data.title).toBe(english?.data.title);
    expect(localized.data.startTime).toBe(session.data.startTime);
    expect(localized.data.speakerSlugs).toEqual(session.data.speakerSlugs);
    expect(localized.data.illustration?.alt).toBe(english?.data.illustration?.alt);
    expect(localized.data.illustration?.src).toBe(session.data.illustration?.src);
    expect(localized.body).toBe(english?.body);
    expect(localized.translation?.id).toBe(session.id);
  });

  it('merges speaker companies by position, keeping names and websites', async () => {
    const speaker = (await getCollection('speakers')).find((entry) => entry.data.companies?.length);
    if (!speaker) throw new Error('no speaker with companies');
    const english = await getEntry('speakersEn', speaker.id);
    const localized = await localizeEntry(speaker, 'en');

    expect(localized.data.name).toBe(speaker.data.name);
    expect(localized.data.bio).toBe(english?.data.bio);
    expect(localized.data.companies?.[0]?.name).toBe(speaker.data.companies?.[0]?.name);
    expect(localized.data.companies?.[0]?.website).toBe(speaker.data.companies?.[0]?.website);
    expect(localized.data.companies?.[0]?.description).toBe(english?.data.companies?.[0]?.description);
  });
});
