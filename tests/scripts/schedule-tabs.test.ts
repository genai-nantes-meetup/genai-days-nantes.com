// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { initScheduleTabs } from '../../src/scripts/schedule-tabs';

function renderTrackFilter() {
  document.body.innerHTML = `
    <section data-schedule-tabs data-active-track="decideurs">
      <div role="group" aria-label="Filtrer par parcours">
        <button id="tab-decideurs" aria-pressed="true" data-schedule-tab="decideurs">Décideurs</button>
        <button id="tab-tech" aria-pressed="false" data-schedule-tab="tech">Tech</button>
      </div>
      <div role="group" aria-label="Déroulé de la journée" data-schedule-panel></div>
    </section>
  `;
}

describe('initScheduleTabs', () => {
  it('activates a track when its filter is clicked', () => {
    renderTrackFilter();
    initScheduleTabs();

    const group = document.querySelector<HTMLElement>('[data-schedule-tabs]')!;
    const techFilter = document.querySelector<HTMLButtonElement>('[data-schedule-tab="tech"]')!;
    const decideursFilter = document.querySelector<HTMLButtonElement>('[data-schedule-tab="decideurs"]')!;
    techFilter.click();

    expect(group.dataset.activeTrack).toBe('tech');
    expect(techFilter.getAttribute('aria-pressed')).toBe('true');
    expect(decideursFilter.getAttribute('aria-pressed')).toBe('false');
  });

  it('leaves the panel name untouched when the track changes', () => {
    renderTrackFilter();
    initScheduleTabs();

    const techFilter = document.querySelector<HTMLButtonElement>('[data-schedule-tab="tech"]')!;
    const panel = document.querySelector<HTMLElement>('[data-schedule-panel]')!;
    techFilter.click();

    expect(panel.getAttribute('aria-label')).toBe('Déroulé de la journée');
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('preselects the track named in the URL query', () => {
    renderTrackFilter();
    initScheduleTabs(document, '?parcours=tech');

    const group = document.querySelector<HTMLElement>('[data-schedule-tabs]')!;
    const techFilter = document.querySelector<HTMLButtonElement>('[data-schedule-tab="tech"]')!;
    const dsiFilter = document.querySelector<HTMLButtonElement>('[data-schedule-tab="dsi"]')!;

    expect(group.dataset.activeTrack).toBe('tech');
    expect(techFilter.getAttribute('aria-pressed')).toBe('true');
    expect(dsiFilter.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the default track when the URL names an unknown one', () => {
    renderTrackFilter();
    initScheduleTabs(document, '?parcours=inconnu');

    const group = document.querySelector<HTMLElement>('[data-schedule-tabs]')!;

    expect(group.dataset.activeTrack).toBe('dsi');
  });
});
