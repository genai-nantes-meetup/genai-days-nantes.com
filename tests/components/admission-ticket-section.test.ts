import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getTicketCtaCopy, IS_WAITLIST_OPEN } from '../../src/lib/pricing';
import AdmissionTicketSection from '../../src/components/AdmissionTicketSection.astro';

describe('AdmissionTicketSection.astro', () => {
  it('renders the shared participant pass purchase call to action', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AdmissionTicketSection);

    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('Un pass pour toute la journée.');
    expect(html).toContain('147 €');
    expect(html).toContain('TVA non applicable');
    expect(html).not.toContain('TTC');
    expect(html).toContain(getTicketCtaCopy('fr').full);
    expect(html).toContain('href="https://www.billetweb.fr/genai-days-nantes-2026"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).not.toContain('mailto:');
    expect(html).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(html).toContain('admission-ticket');
    expect(html).toContain('admission-ticket__stub');
    expect(html).toContain('/da/admission-ticket-blank-brick-v1-optimized.webp');
    expect(html).not.toContain('/da/admission-ticket-blank-v1-optimized.webp');
    expect(html).toContain('editorial-cta--conversion');
  });

  it('renders the English pass on English pages, with localized price, date and links', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AdmissionTicketSection, {
      request: new Request('https://example.com/en/program'),
    });

    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('One pass for the whole day.');
    expect(html).toContain('Talks are delivered in French.');
    expect(html).toContain('aria-label="Participant Pass · €147 · VAT not applicable"');
    expect(html).toContain('November 17, 2026');
    expect(html).toContain('17·NOV·26');
    expect(html).toContain(getTicketCtaCopy('en').full);
    expect(html).toContain('href="/en/practical-info"');
    expect(html).not.toContain(getTicketCtaCopy('fr').full);
    expect(html).toContain('VAT not applicable');
    expect(html).not.toContain('TTC');
    expect(html).not.toContain('incl. VAT');
  });

  it('stamps the ticket only once the seats are gone', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AdmissionTicketSection);

    expect(html.includes('class="admission-ticket__stamp')).toBe(IS_WAITLIST_OPEN);
    expect(html.includes('places · complet')).toBe(IS_WAITLIST_OPEN);
  });
});
