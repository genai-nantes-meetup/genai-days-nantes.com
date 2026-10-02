import { describe, expect, it } from 'vitest';
import { getAlternatePaths, getLocaleFromPath, localizePath } from '../../src/lib/i18n';

describe('getLocaleFromPath', () => {
  it('reads English from the /en prefix only', () => {
    expect(getLocaleFromPath('/en')).toBe('en');
    expect(getLocaleFromPath('/en/partners')).toBe('en');
    expect(getLocaleFromPath('/')).toBe('fr');
    expect(getLocaleFromPath('/partenaires')).toBe('fr');
    expect(getLocaleFromPath('/english')).toBe('fr');
  });
});

describe('localizePath', () => {
  it('translates page paths and their sub-paths', () => {
    expect(localizePath('/', 'en')).toBe('/en');
    expect(localizePath('/partenaires', 'en')).toBe('/en/partners');
    expect(localizePath('/programme/agentic-coding', 'en')).toBe('/en/program/agentic-coding');
    expect(localizePath('/stickers/recompense', 'en')).toBe('/en/stickers/reward');
  });

  it('keeps the query and the anchor', () => {
    expect(localizePath('/programme?parcours=tech#creneau-1000', 'en')).toBe('/en/program?parcours=tech#creneau-1000');
    expect(localizePath('/partenaires#devenir-partenaire', 'en')).toBe('/en/partners#devenir-partenaire');
    expect(localizePath('/#programme', 'en')).toBe('/en#programme');
  });

  it('leaves assets, anchors, external URLs and French links untouched', () => {
    expect(localizePath('/images/cover_v2-optimized.webp', 'en')).toBe('/images/cover_v2-optimized.webp');
    expect(localizePath('/llms.txt', 'en')).toBe('/llms.txt');
    expect(localizePath('/api/contact-details', 'en')).toBe('/api/contact-details');
    expect(localizePath('#programme', 'en')).toBe('#programme');
    expect(localizePath('https://naomakers.com', 'en')).toBe('https://naomakers.com');
    expect(localizePath('/en/partners', 'en')).toBe('/en/partners');
    expect(localizePath('/partenaires', 'fr')).toBe('/partenaires');
  });
});

describe('getAlternatePaths', () => {
  it('pairs each page with its other language, from either side', () => {
    expect(getAlternatePaths('/')).toEqual({ fr: '/', en: '/en' });
    expect(getAlternatePaths('/en/')).toEqual({ fr: '/', en: '/en' });
    expect(getAlternatePaths('/equipe')).toEqual({ fr: '/equipe', en: '/en/team' });
    expect(getAlternatePaths('/en/speakers/quentin-adam')).toEqual({
      fr: '/speakers/quentin-adam',
      en: '/en/speakers/quentin-adam',
    });
  });

  it('declares no alternate for a path outside the route table', () => {
    expect(getAlternatePaths('/llms.txt')).toBeUndefined();
    expect(getAlternatePaths('/en/inconnue')).toBeUndefined();
  });
});
