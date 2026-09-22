// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collect, getCollected, uncollect } from '../../src/lib/label-collection';
import { getChoices } from '../../src/lib/my-day';
import {
  ARCHIVE_CHANGE_EVENT,
  ARCHIVE_REQUEST_EVENT,
  ARCHIVE_UPDATE_EVENT,
  describeSessionChosen,
  describeSessionRemoved,
  initMyDay,
} from '../../src/scripts/my-day';

const captureSpy = vi.fn();

vi.mock('../../src/lib/analytics', () => ({
  capture: (...args: unknown[]) => captureSpy(...args),
}));

function sessionItem(sessionId: string, startTime: string, track: string, title: string): string {
  return `<li data-label-archive-item data-label-id="session-${sessionId}" data-session-id="${sessionId}" data-session-start="${startTime}" data-session-track="${track}" data-session-title="${title}" hidden><em data-my-day-choice-marker hidden>Ma journée</em></li>`;
}

function mountPage(): void {
  document.body.innerHTML = `
    <main>
      <article data-my-day-session="finops"><div data-label-origin data-label-id="session-finops"></div><button data-my-day-toggle aria-pressed="false">Je viens</button></article>
      <article data-my-day-session="slm"><div data-label-origin data-label-id="session-slm"></div><button data-my-day-toggle aria-pressed="false">Je viens</button></article>
      <article data-my-day-session="contest"><button data-my-day-toggle aria-pressed="false">Je viens</button></article>
    </main>
    <aside data-label-archive><ol>
      ${sessionItem('finops', '15:55', 'decideurs', 'FinOps')}
      ${sessionItem('slm', '15:55', 'tech', 'SLM')}
      ${sessionItem('contest', '13:45', 'decideurs', 'Startup Contest')}
      <li data-label-archive-item data-label-id="landing-day-manifesto" hidden></li>
    </ol></aside>
    <div data-label-archive-live></div>`;
}

function archiveChange(labelId: string, method = 'pointer'): void {
  document.dispatchEvent(new CustomEvent(ARCHIVE_CHANGE_EVENT, { detail: { labelId, method } }));
}

const card = (id: string) => document.querySelector<HTMLElement>(`[data-my-day-session="${id}"]`)!;
const archiveItem = (id: string) => document.querySelector<HTMLElement>(`[data-session-id="${id}"]`)!;

describe('my day in the collection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    captureSpy.mockClear();
    mountPage();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('describes a choice, a swap and a removal', () => {
    expect(describeSessionChosen('SLM', '15:55')).toContain('ajoutée à ma journée');
    expect(describeSessionChosen('SLM', '15:55', 'FinOps')).toContain('remplace « FinOps »');
    expect(describeSessionRemoved('SLM', '15:55')).toContain('retirée de ma journée');
  });

  it('does nothing without session metadata in the collection', () => {
    document.body.innerHTML = '<aside data-label-archive></aside>';
    expect(initMyDay()).toBe(0);
  });

  it('marks a collected session in the shared collection', () => {
    expect(initMyDay()).toBe(1);
    const toggle = card('finops').querySelector<HTMLElement>('[data-my-day-toggle]')!;
    const accessibleName = 'Inclure « FinOps » dans ma journée';
    expect(toggle.getAttribute('aria-label')).toBe(accessibleName);
    collect('session-finops');
    archiveChange('session-finops');
    expect(getChoices()).toEqual({ '15:55': 'finops' });
    expect(archiveItem('finops').dataset.myDayState).toBe('chosen');
    expect(archiveItem('finops').querySelector<HTMLElement>('[data-my-day-choice-marker]')!.hidden).toBe(false);
    expect(card('finops').dataset.myDayState).toBe('chosen');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe(accessibleName);
  });

  it('returns the replaced session label when another session takes its slot', () => {
    initMyDay();
    collect('session-finops');
    archiveChange('session-finops');
    collect('session-slm');
    archiveChange('session-slm', 'keyboard');
    expect(getChoices()).toEqual({ '15:55': 'slm' });
    expect(getCollected()).toEqual(['session-slm']);
    expect(archiveItem('finops').dataset.myDayState).toBe('free');
    expect(archiveItem('slm').dataset.myDayState).toBe('chosen');
  });

  it('removes a choice when its label leaves the collection', () => {
    initMyDay();
    collect('session-finops');
    archiveChange('session-finops');
    uncollect('session-finops');
    document.dispatchEvent(new CustomEvent(ARCHIVE_UPDATE_EVENT));
    expect(getChoices()).toEqual({});
    expect(card('finops').dataset.myDayState).toBe('free');
  });

  it('asks an existing page label to collect itself', () => {
    initMyDay();
    const origin = document.querySelector<HTMLElement>('[data-label-id="session-slm"]')!;
    const request = vi.fn();
    origin.addEventListener(ARCHIVE_REQUEST_EVENT, request);
    card('slm').querySelector<HTMLButtonElement>('[data-my-day-toggle]')!.click();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('collects and chooses a session with no origin on the page', () => {
    initMyDay();
    card('contest').querySelector<HTMLButtonElement>('[data-my-day-toggle]')!.click();
    expect(getCollected()).toEqual(['session-contest']);
    expect(getChoices()).toEqual({ '13:45': 'contest' });
  });

  it('returns a session label when its choice is removed', () => {
    initMyDay();
    collect('session-finops');
    archiveChange('session-finops');
    const toggle = card('finops').querySelector<HTMLButtonElement>('[data-my-day-toggle]')!;
    toggle.click();
    expect(getChoices()).toEqual({});
    expect(getCollected()).toEqual([]);
  });

  it('ignores labels that are not sessions', () => {
    initMyDay();
    collect('landing-day-manifesto');
    archiveChange('landing-day-manifesto');
    expect(getChoices()).toEqual({});
    expect(captureSpy).not.toHaveBeenCalled();
  });
});
