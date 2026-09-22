// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

const { scrollPageToTopMock } = vi.hoisted(() => ({
  scrollPageToTopMock: vi.fn(),
}));

vi.mock('../../src/scripts/smooth-scroll', () => ({
  scrollPageToTop: scrollPageToTopMock,
}));

import { initScrollTop } from '../../src/scripts/scroll-top';

const renderTriggers = (): void => {
  document.body.innerHTML = `
    <a href="/" data-scroll-top>Accueil</a>
    <button type="button" data-scroll-top>Revenir en haut</button>
  `;
};

afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
  scrollPageToTopMock.mockClear();
  vi.unstubAllGlobals();
});

describe('initScrollTop', () => {
  it('smoothly scrolls instead of reloading from the home wordmark', () => {
    renderTriggers();
    initScrollTop();

    const link = document.querySelector<HTMLAnchorElement>('a[data-scroll-top]');
    const shouldNavigate = link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(shouldNavigate).toBe(false);
    expect(scrollPageToTopMock).toHaveBeenCalledOnce();
  });

  it('keeps the home navigation from an internal page', () => {
    renderTriggers();
    window.history.replaceState({}, '', '/programme');
    initScrollTop();

    const link = document.querySelector<HTMLAnchorElement>('a[data-scroll-top]');
    const shouldNavigate = link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(shouldNavigate).toBe(true);
    expect(scrollPageToTopMock).not.toHaveBeenCalled();
  });

  it('uses the same scroll engine for the floating button', () => {
    renderTriggers();
    initScrollTop();

    document.querySelector<HTMLButtonElement>('button[data-scroll-top]')?.click();

    expect(scrollPageToTopMock).toHaveBeenCalledOnce();
  });
});
