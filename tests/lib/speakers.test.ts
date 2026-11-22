import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { SESSION_ILLUSTRATION_DIMENSIONS, sortSpeakersByProminence } from '../../src/lib/speakers';

const speaker = (id: string, name: string) => ({ id, data: { name } });

describe('sortSpeakersByProminence', () => {
  it('puts prominent speakers first, then the others alphabetically', () => {
    const sorted = sortSpeakersByProminence([
      speaker('zoe-last', 'Zoe Last'),
      speaker('quentin-adam', 'Quentin Adam'),
      speaker('alice-first', 'Alice First'),
      speaker('christelle-morancais', 'Christelle Morancais'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'christelle-morancais',
      'quentin-adam',
      'alice-first',
      'zoe-last',
    ]);
  });

  it('forces the MCs at the bottom, in their declared order', () => {
    const sorted = sortSpeakersByProminence([
      speaker('florian-herveou', 'Florian Herveou'),
      speaker('marie-fleur-sacreste', 'Marie-Fleur Sacreste'),
      speaker('zoe-last', 'Zoe Last'),
      speaker('annabelle-koster', 'Annabelle Koster'),
      speaker('christelle-morancais', 'Christelle Morancais'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'christelle-morancais',
      'zoe-last',
      'florian-herveou',
      'annabelle-koster',
      'marie-fleur-sacreste',
    ]);
  });

  it('places the Startup Contest jury after the pitchers and before the MCs', () => {
    const sorted = sortSpeakersByProminence([
      speaker('annabelle-koster', 'Annabelle Koster'),
      speaker('thomas-mathieu', 'Thomas Mathieu'),
      speaker('emmanuel-marboeuf', 'Emmanuel Marboeuf'),
      speaker('benoit-hediard', 'Benoit Hediard'),
      speaker('zoe-last', 'Zoe Last'),
      speaker('sebastien-le-corfec', 'Sébastien Le Corfec'),
      speaker('constance-nebbula', 'Constance Nebbula'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'constance-nebbula',
      'zoe-last',
      'emmanuel-marboeuf',
      'benoit-hediard',
      'sebastien-le-corfec',
      'thomas-mathieu',
      'annabelle-koster',
    ]);
  });

  it('places the roundtable moderator after the jury and just before the MCs', () => {
    const sorted = sortSpeakersByProminence([
      speaker('annabelle-koster', 'Annabelle Koster'),
      speaker('celine-haentzler', 'Céline Haentzler'),
      speaker('thomas-mathieu', 'Thomas Mathieu'),
      speaker('zoe-last', 'Zoe Last'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'zoe-last',
      'thomas-mathieu',
      'celine-haentzler',
      'annabelle-koster',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [speaker('b', 'B'), speaker('a', 'A')];
    sortSpeakersByProminence(input);
    expect(input.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('SESSION_ILLUSTRATION_DIMENSIONS', () => {
  const sessionsDirectory = 'src/content/sessions';
  const illustrationSources = readdirSync(sessionsDirectory)
    .filter((name) => name.endsWith('.md'))
    .map((name) => readFileSync(`${sessionsDirectory}/${name}`, 'utf8').match(/^\s+src:\s*"([^"]+)"/m)?.[1])
    .filter((src): src is string => Boolean(src));

  it('lists every session illustration', () => {
    expect(Object.keys(SESSION_ILLUSTRATION_DIMENSIONS).sort()).toEqual([...new Set(illustrationSources)].sort());
  });

  it.each(Object.entries(SESSION_ILLUSTRATION_DIMENSIONS))('matches the real size of %s', async (src, expected) => {
    const { width, height } = await sharp(`public${src}`).metadata();
    expect({ width, height }).toEqual(expected);
  });
});
