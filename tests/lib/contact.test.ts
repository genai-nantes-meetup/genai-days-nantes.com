import { describe, expect, it } from 'vitest';
import { CONTACT_PROFILES, CONTACT_TOPICS, isContactTopic } from '../../src/lib/contact';

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
    expect(CONTACT_PROFILES.partner.name).toBe('Dorian Ouvrard');
    expect(CONTACT_PROFILES.partner.subject).toBe('Proposition de partenariat');
    expect(CONTACT_PROFILES.press.name).toBe('Emilie Blum');
    expect(CONTACT_PROFILES.press.image).toBe('/organisateurs/emilie-blum-optimized.webp');
    expect(CONTACT_PROFILES.press.message).toContain('Bonjour Emilie,');
  });
});
