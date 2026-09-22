import { describe, expect, it } from 'vitest';
import ProgrammePage from '../../src/pages/programme.astro';
import { createAstroContainer } from '../utils/create-astro-container';
import { IS_MY_DAY_ENABLED } from '../../src/lib/features';

describe('programme.astro', () => {
  it('renders the event schedule on a dedicated page', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ProgrammePage);

    expect(html).toContain('<title>Programme IA générative 2026 à Nantes · GenAI Days</title>');
    expect(html).toContain('<h1');
    expect(html).toContain('Programme');
    expect(html).toContain('id="planning"');
    expect(html).toContain('Keynote d’ouverture');
    expect(html).toContain('Clôture visiteurs');
    expect(html).toContain('Nicolas Martignole');
    expect(html).toContain('Startup Contest');
    expect(html).toContain('Constance Nebbula');
    expect(html).toContain('Sébastien Le Corfec');
    expect(html).toContain('Thomas Mathieu');
    expect(html).toContain('Florian Hervéou');
    expect(html).toContain('href="/programme/startup-contest"');
    expect(html).toContain('aria-label="Filtrer par parcours"');
    expect(html).toContain('class="programme-page"');
    expect(html).toContain('/images/hotel-region-banner-genai-days-optimized.webp');
    expect(html).toContain('class="schedule-section"');
    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('/da/admission-ticket-blank-brick-v1-optimized.webp');
    expect(html).not.toContain('/da/admission-ticket-blank-v1-optimized.webp');
    expect(html).not.toContain('Une journée rythmée par deux parcours complémentaires');
    expect(html).toContain('Le programme IA générative de la journée');
    expect(html).toContain('Passez librement de l’un à l’autre entre les sessions.');
    expect(html.match(/data-track-mark="decideurs"/g)).toHaveLength(2);
    expect(html.match(/data-track-mark="tech"/g)).toHaveLength(2);
  });

  it('hosts the label collection drawer', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ProgrammePage);

    expect(html).toContain('data-label-archive');
    expect(html).toContain('data-label-archive-live');
  });

  it.runIf(IS_MY_DAY_ENABLED)('lets programme sessions join « Ma journée »', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ProgrammePage);

    expect(html).toContain('data-my-day-session="finops-agents-dev-tools"');
  });
});
