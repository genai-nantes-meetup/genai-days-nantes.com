import { describe, it, expect } from 'vitest';
import { CTA_LINKS } from '../../src/lib/cta-links';

describe('CTA_LINKS', () => {
  it('exposes the ticket and Agora destinations only', () => {
    expect(Object.keys(CTA_LINKS)).toEqual(['tickets', 'agora']);
  });

  it('routes tickets to an external URL placeholder', () => {
    expect(CTA_LINKS.tickets.startsWith('https://')).toBe(true);
  });

  it('routes Agora to the companion app', () => {
    expect(CTA_LINKS.agora).toBe('https://agora.genai-days-nantes.com/');
  });
});
