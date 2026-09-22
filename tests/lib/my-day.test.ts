// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseSession,
  clear,
  getChoices,
  getChosenSessionAt,
  isChosen,
  labelIdFromSessionId,
  removeSession,
  retainOnlySessions,
  sessionIdFromLabelId,
} from '../../src/lib/my-day';

describe('my-day', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps a session label id to its session and back', () => {
    expect(sessionIdFromLabelId('session-finops-agents-dev-tools')).toBe('finops-agents-dev-tools');
    expect(sessionIdFromLabelId('speaker-nicolas-martignole')).toBeNull();
    expect(sessionIdFromLabelId('session-')).toBeNull();
    expect(labelIdFromSessionId('startup-contest')).toBe('session-startup-contest');
  });

  it('sticks one session per slot and reports the one it replaces', () => {
    expect(chooseSession('finops-agents-dev-tools', '15:55')).toEqual({ ok: true });
    expect(getChosenSessionAt('15:55')).toBe('finops-agents-dev-tools');
    expect(isChosen('finops-agents-dev-tools')).toBe(true);

    expect(chooseSession('slm-compression-modeles', '15:55')).toEqual({
      ok: true,
      replaced: 'finops-agents-dev-tools',
    });
    expect(getChoices()).toEqual({ '15:55': 'slm-compression-modeles' });
    expect(isChosen('finops-agents-dev-tools')).toBe(false);
  });

  it('keeps a session on a single slot even when its start time changes', () => {
    chooseSession('startup-contest', '13:45');
    chooseSession('startup-contest', '14:25');

    expect(getChoices()).toEqual({ '14:25': 'startup-contest' });
  });

  it('choosing the same session again is a no-op without a replacement', () => {
    chooseSession('startup-contest', '13:45');

    expect(chooseSession('startup-contest', '13:45')).toEqual({ ok: true });
    expect(getChoices()).toEqual({ '13:45': 'startup-contest' });
  });

  it('frees the slot when the session is removed', () => {
    chooseSession('startup-contest', '13:45');

    expect(removeSession('startup-contest')).toBe(true);
    expect(getChosenSessionAt('13:45')).toBeUndefined();
    expect(removeSession('startup-contest')).toBe(true);
  });

  it('drops the sessions whose label left the archive and reports them', () => {
    chooseSession('startup-contest', '13:45');
    chooseSession('slm-compression-modeles', '11:15');

    expect(retainOnlySessions(['slm-compression-modeles'])).toEqual(['startup-contest']);
    expect(getChoices()).toEqual({ '11:15': 'slm-compression-modeles' });
    expect(retainOnlySessions(['slm-compression-modeles'])).toEqual([]);
  });

  it('starts from an empty day when the stored state is corrupted', () => {
    window.localStorage.setItem('genaidays:my-day:v1', '{not json');
    expect(getChoices()).toEqual({});

    window.localStorage.setItem('genaidays:my-day:v1', JSON.stringify({ choices: { '09:40': 42, '10:20': '' } }));
    expect(getChoices()).toEqual({});
  });

  it('refuses a choice the storage cannot keep, leaving the day untouched', () => {
    chooseSession('finops-agents-dev-tools', '15:55');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(chooseSession('slm-compression-modeles', '15:55')).toEqual({ ok: false });
    expect(removeSession('finops-agents-dev-tools')).toBe(false);

    vi.restoreAllMocks();
    expect(getChoices()).toEqual({ '15:55': 'finops-agents-dev-tools' });
  });

  it('clears the day without touching the label archive', () => {
    window.localStorage.setItem('genaidays:label-archive:v5', JSON.stringify({ collected: ['session-a'], placements: {} }));
    chooseSession('a', '09:40');

    clear();

    expect(getChoices()).toEqual({});
    expect(window.localStorage.getItem('genaidays:label-archive:v5')).toContain('session-a');
  });
});
