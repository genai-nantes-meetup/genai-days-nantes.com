// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initIssueIndex } from '../../src/scripts/issue-index';

const renderIssueIndex = (): void => {
  document.body.innerHTML = `
    <section data-issue-index>
      <ol>
        <li data-active="true">
          <button data-issue-trigger aria-pressed="true"></button>
        </li>
        <li data-active="false">
          <button data-issue-trigger aria-pressed="false"></button>
        </li>
      </ol>
      <div data-issue-visual data-active="true" aria-hidden="false"></div>
      <div data-issue-visual data-active="false" aria-hidden="true"></div>
    </section>
  `;
};

const movePointer = (target: Element, clientX: number, clientY: number): void => {
  const event = new MouseEvent('pointermove', { bubbles: true, clientX, clientY });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
};

describe('initIssueIndex', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    renderIssueIndex();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('changes the active issue immediately after intentional pointer movement', () => {
    initIssueIndex();

    const section = document.querySelector<HTMLElement>('[data-issue-index]');
    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]');
    const rows = document.querySelectorAll<HTMLLIElement>('li');
    const visuals = document.querySelectorAll<HTMLElement>('[data-issue-visual]');

    movePointer(triggers[1], 10, 10);
    movePointer(triggers[1], 13, 10);

    expect(section?.dataset.issueIndexReady).toBe('true');
    expect(triggers[0].getAttribute('aria-pressed')).toBe('false');
    expect(triggers[1].getAttribute('aria-pressed')).toBe('true');
    expect(rows[0].dataset.active).toBe('false');
    expect(rows[1].dataset.active).toBe('true');
    expect(visuals[0].getAttribute('aria-hidden')).toBe('true');
    expect(visuals[1].getAttribute('aria-hidden')).toBe('false');
    expect(section?.dataset.issueDirection).toBe('forward');
    expect(section?.classList.contains('is-transitioning')).toBe(true);
    expect(visuals[1].classList.contains('is-entering')).toBe(true);

    vi.advanceTimersByTime(680);

    expect(section?.classList.contains('is-transitioning')).toBe(false);
    expect(visuals[1].classList.contains('is-entering')).toBe(false);
  });

  it('requires fresh pointer movement after scrolling without a time delay', () => {
    initIssueIndex();

    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]');
    const visuals = document.querySelectorAll<HTMLElement>('[data-issue-visual]');

    window.dispatchEvent(new Event('scroll'));
    movePointer(triggers[1], 10, 10);
    expect(visuals[0].dataset.active).toBe('true');

    movePointer(triggers[1], 13, 10);
    expect(visuals[1].dataset.active).toBe('true');
  });

  it('ignores a title entering under a stationary pointer', () => {
    initIssueIndex();

    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]');
    const visuals = document.querySelectorAll<HTMLElement>('[data-issue-visual]');

    triggers[1].dispatchEvent(new Event('pointerenter'));

    expect(visuals[0].dataset.active).toBe('true');
  });

  it('uses the same active state for keyboard focus', () => {
    initIssueIndex();

    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]');
    const visuals = document.querySelectorAll<HTMLElement>('[data-issue-visual]');

    triggers[1].dispatchEvent(new FocusEvent('focus'));
    triggers[0].dispatchEvent(new FocusEvent('focus'));

    expect(triggers[0].getAttribute('aria-pressed')).toBe('true');
    expect(visuals[0].dataset.active).toBe('true');
    expect(document.querySelector<HTMLElement>('[data-issue-index]')?.dataset.issueDirection).toBe('backward');
  });

  it('keeps the state change instant when reduced motion is requested', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    initIssueIndex();

    const section = document.querySelector<HTMLElement>('[data-issue-index]');
    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]');
    const visuals = document.querySelectorAll<HTMLElement>('[data-issue-visual]');

    triggers[1].click();

    expect(visuals[1].dataset.active).toBe('true');
    expect(section?.classList.contains('is-transitioning')).toBe(false);
    expect(visuals[1].classList.contains('is-entering')).toBe(false);
  });
});
