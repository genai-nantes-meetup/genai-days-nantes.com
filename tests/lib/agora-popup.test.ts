// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EVENT from '../../src/content/event.json';
import {
  AGORA_POPUP_STORAGE_KEY,
  dismissAgoraPopup,
  getParisDate,
  isAgoraPopupDay,
  isAgoraPopupDismissed,
} from '../../src/lib/agora-popup';

describe('agora-popup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows on the event day', () => {
    expect(isAgoraPopupDay(new Date(`${EVENT.date}T12:00:00+01:00`))).toBe(true);
  });

  it('stays hidden on the eve and the day after the event', () => {
    expect(isAgoraPopupDay(new Date('2026-11-16T12:00:00+01:00'))).toBe(false);
    expect(isAgoraPopupDay(new Date('2026-11-18T12:00:00+01:00'))).toBe(false);
  });

  it('reads the day in Paris time, not UTC', () => {
    // 23:30 UTC on the 16th is 00:30 on the 17th in Paris.
    expect(getParisDate(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-17');
    expect(isAgoraPopupDay(new Date('2026-11-16T23:30:00Z'))).toBe(true);
    // 23:30 UTC on the 17th is already the 18th in Paris.
    expect(isAgoraPopupDay(new Date('2026-11-17T23:30:00Z'))).toBe(false);
  });

  it('remembers the dismissal', () => {
    expect(isAgoraPopupDismissed()).toBe(false);
    expect(dismissAgoraPopup()).toBe(true);
    expect(window.localStorage.getItem(AGORA_POPUP_STORAGE_KEY)).toBe('dismissed');
    expect(isAgoraPopupDismissed()).toBe(true);
  });

  it('ignores an unexpected stored value', () => {
    window.localStorage.setItem(AGORA_POPUP_STORAGE_KEY, 'other');
    expect(isAgoraPopupDismissed()).toBe(false);
  });

  it('survives a storage that refuses reads and writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(isAgoraPopupDismissed()).toBe(false);
    expect(dismissAgoraPopup()).toBe(false);
  });
});
