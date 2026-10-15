import { describe, it, expect } from 'vitest';
import { sortSpeakersByProminence } from '../../src/lib/speakers';

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
      speaker('zoe-last', 'Zoe Last'),
      speaker('sebastien-le-corfec', 'Sébastien Le Corfec'),
      speaker('constance-nebbula', 'Constance Nebbula'),
    ]);

    expect(sorted.map((s) => s.id)).toEqual([
      'constance-nebbula',
      'zoe-last',
      'emmanuel-marboeuf',
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
