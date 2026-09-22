import { describe, it, expect } from 'vitest';
import { CTA_LINKS } from '../../src/lib/cta-links';

describe('CTA_LINKS', () => {
  it('exposes only the public ticket destination', () => {
    expect(Object.keys(CTA_LINKS)).toEqual(['tickets']);
  });

  it('routes tickets to an external URL placeholder', () => {
    expect(CTA_LINKS.tickets.startsWith('https://')).toBe(true);
  });
});
