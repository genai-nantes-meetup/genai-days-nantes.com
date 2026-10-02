import { describe, expect, it } from 'vitest';
import { CONTACT_PROFILES, CONTACT_TOPICS, isContactTopic } from '../../src/lib/contact';
import { LOCALES } from '../../src/lib/i18n';

describe('contact profiles', () => {
  it('supports every contact path used by the site', () => {
    expect(CONTACT_TOPICS).toEqual([
      'general',
      'partner',
      'programme',
      'press',
      'privacy',
      'publication',
    ]);
    expect(isContactTopic('press')).toBe(true);
    expect(isContactTopic('unknown')).toBe(false);
  });

  it('keeps contact values out of source profiles', () => {
    const serializedProfiles = JSON.stringify(CONTACT_PROFILES);

    expect(serializedProfiles).not.toContain('mailto:');
    expect(serializedProfiles).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(CONTACT_PROFILES.partner.fr.name).toBe('Dorian Ouvrard');
    expect(CONTACT_PROFILES.partner.fr.subject).toBe('Proposition de partenariat');
    expect(CONTACT_PROFILES.press.fr.name).toBe('Emilie Blum');
    expect(CONTACT_PROFILES.press.image).toBe('/organisateurs/emilie-blum-optimized.webp');
    expect(CONTACT_PROFILES.press.fr.message).toContain('Bonjour Emilie,');
  });

  it('drafts every contact in French and English', () => {
    for (const topic of CONTACT_TOPICS) {
      for (const locale of LOCALES) {
        expect(CONTACT_PROFILES[topic][locale].subject).not.toBe('');
        expect(CONTACT_PROFILES[topic][locale].message).not.toBe('');
      }
    }

    expect(CONTACT_PROFILES.general.fr.subject).toBe('Question sur l’événement du 17 novembre');
    expect(CONTACT_PROFILES.general.en.subject).toBe('Question about the November 17 event');
    expect(CONTACT_PROFILES.general.en.name).toBe('The Naomakers team');
    expect(CONTACT_PROFILES.press.en.message).toContain('Hi Emilie,');
    expect(CONTACT_PROFILES.press.en.subject).toBe('Press request');
  });
});
