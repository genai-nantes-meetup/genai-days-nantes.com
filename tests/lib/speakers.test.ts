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
      'annabelle-koster',
      'marie-fleur-sacreste',
      'florian-herveou',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [speaker('b', 'B'), speaker('a', 'A')];
    sortSpeakersByProminence(input);
    expect(input.map((s) => s.id)).toEqual(['b', 'a']);
  });
});
