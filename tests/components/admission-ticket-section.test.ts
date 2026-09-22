import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AdmissionTicketSection from '../../src/components/AdmissionTicketSection.astro';

describe('AdmissionTicketSection.astro', () => {
  it('renders the shared participant pass purchase call to action', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AdmissionTicketSection);

    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('Un pass pour toute la journée.');
    expect(html).toContain('147 € HT');
    expect(html).toContain('Réserver ma place');
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
});
