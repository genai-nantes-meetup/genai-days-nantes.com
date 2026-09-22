import { describe, it, expect } from 'vitest';
import ScheduleSection from '../../src/components/ScheduleSection.astro';
import { createAstroContainer } from '../utils/create-astro-container';
import { IS_MY_DAY_ENABLED } from '../../src/lib/features';

describe('ScheduleSection.astro', () => {
  it('renders the provisional day from the shared arrival to visitor closing', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);
    const arrivalIndex = html.indexOf('Accueil visiteurs, partenaires et café');
    const closingIndex = html.indexOf('Clôture visiteurs');

    expect(arrivalIndex).toBeGreaterThan(-1);
    expect(closingIndex).toBeGreaterThan(arrivalIndex);
    expect(html).toContain('08:30');
    expect(html).toContain('22:00');
  });

  it('renders the confirmed FinOps session and resolves its speaker', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('FinOps');
    expect(html).toContain('Nicolas Martignole');
    expect(html).toContain('href="/speakers/nicolas-martignole"');
    expect(html).toContain('href="/programme/finops-agents-dev-tools"');
    expect(html).toContain('Startup Contest');
    expect(html).toContain('href="/programme/startup-contest"');
    expect(html).toContain('Nicolas Martignole</a>');
    expect(html).toContain('Conférence · 40 min');
  });

  it.skipIf(IS_MY_DAY_ENABLED)('hides « Ma journée » while the feature is disabled', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).not.toContain('data-my-day-session');
    expect(html).not.toContain('data-my-day-toggle');
  });

  it.runIf(IS_MY_DAY_ENABLED)('gives every announced conference a way into « Ma journée » without covering its visual', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('id="creneau-1555"');
    expect(html).toContain('data-schedule-slot="15:55"');
    expect(html).toContain('data-my-day-session="finops-agents-dev-tools"');
    expect(html).toContain('aria-label="Inclure « Startup Contest » dans ma journée"');
    expect(html).toMatch(/<button[^>]*data-my-day-toggle[^>]*aria-pressed="false"/);
    expect(html).toContain('schedule-session__time-column');
    expect(html).toContain('my-day-toggle--gutter');
    expect(html).toContain('title="Ajouter à ma journée"');
    expect(html).not.toContain('schedule-session__stamp');
    expect(html).not.toContain('data-label-origin');
    expect(html).not.toContain('data-label-corner');
    /* La programmation à venir n'a rien à décoller ni à choisir. */
    expect(html).not.toContain('data-my-day-session="undefined"');
    expect(html).toContain('data-my-day-session="podcast-maci"');
    expect(html).toContain('aria-label="Inclure « Podcast MACI » dans ma journée"');
  });

  it('marks unannounced conference content as forthcoming', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('Programmation à venir');
    expect(html).toContain('Horaires et contenus susceptibles d’évoluer.');
    expect(html).not.toContain('Premiers éléments');
    expect(html).not.toContain('Le découpage horaire est posé.');
  });

  it('lays out the two tracks side by side with track headers', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('class="schedule-track-headings"');
    expect(html).toContain('Ceux qui décident');
    expect(html).toContain('Ceux qui implémentent');
    expect(html).not.toContain('Pour ceux qui décident');
    expect(html).not.toContain('Pour ceux qui implémentent');
    expect(html.match(/data-track-mark="decideurs"/g)).toHaveLength(2);
    expect(html.match(/data-track-mark="tech"/g)).toHaveLength(2);
    expect(html).not.toContain('Usages, coûts et ROI');
    expect(html).not.toContain('Agents, contexte et évaluation');
    expect(html).not.toContain('schedule-track-overview');
    expect(html).toContain('class="schedule-section__inner"');
  });

  it('segments the schedule into scannable parts of the day', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('id="schedule-daypart-matin"');
    expect(html).toContain('id="schedule-daypart-dejeuner"');
    expect(html).toContain('id="schedule-daypart-apres-midi"');
    expect(html).toContain('id="schedule-daypart-soiree"');
  });

  it('provides a mobile two-button filter for switching between tracks', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('aria-label="Filtrer par parcours"');
    expect(html).toContain('data-schedule-tab="decideurs"');
    expect(html).toContain('data-schedule-tab="tech"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-schedule-track="decideurs"');
    expect(html).toContain('data-schedule-track="tech"');
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tabpanel"');
  });

  it('includes every shared keynote, pause, meal, and afterwork milestone', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ScheduleSection);

    expect(html).toContain('Keynote d’ouverture');
    expect(html).toContain('Christelle Morançais');
    expect(html).toContain('href="/programme/keynote-ouverture-christelle-morancais"');
    expect(html).toContain('Déplacement et pause café');
    expect(html).toContain('Déjeuner');
    expect(html).toContain('Keynote de clôture');
    expect(html).toContain('Afterwork');
    expect(html).toContain('id="creneau-1800"');
    expect(html).toContain('href="/programme/podcast-maci"');
    expect(html).toContain('Podcast · 120 min');
    expect(html).toContain('/talks/podcast-maci-clever-cloud-optimized.webp');
    expect(html).toContain('href="https://www.clever.cloud/"');
    expect(html).toContain('>Clever Cloud</a>');
  });
});
