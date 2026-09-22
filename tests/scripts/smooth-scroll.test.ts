// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { LenisMock, lenisDestroyMock, lenisScrollToMock } = vi.hoisted(() => ({
  LenisMock: vi.fn(),
  lenisDestroyMock: vi.fn(),
  lenisScrollToMock: vi.fn(),
}));

vi.mock('lenis', () => ({ default: LenisMock }));

import { initSmoothScroll, scrollPageToTop } from '../../src/scripts/smooth-scroll';

const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches }),
  );
};

beforeEach(() => {
  LenisMock.mockImplementation(function LenisInstanceMock() {
    return {
      destroy: lenisDestroyMock,
      scrollTo: lenisScrollToMock,
    };
  });
});

afterEach(() => {
  stubReducedMotion(true);
  initSmoothScroll();
  LenisMock.mockClear();
  lenisDestroyMock.mockClear();
  lenisScrollToMock.mockClear();
  vi.unstubAllGlobals();
});

describe('initSmoothScroll', () => {
  it('starts the lamalama-style wheel inertia', () => {
    stubReducedMotion(false);

    initSmoothScroll();

    expect(LenisMock).toHaveBeenCalledWith({
      autoRaf: true,
      anchors: false,
      lerp: 0.1,
      smoothWheel: true,
    });
  });

  /* Les ancres de Lenis visaient jusqu'à mille pixels trop haut sur les pages
   * longues, si bien que la section cliquée finissait sous la ligne de
   * flottaison. Le saut est donc calculé sur le document, réserve du header
   * collant comprise. */
  it('aims an anchor at the target minus its scroll margin', () => {
    stubReducedMotion(false);
    initSmoothScroll();

    document.body.innerHTML = '<a href="#cible">Aller</a><section id="cible"></section>';
    const target = document.getElementById('cible') as HTMLElement;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 1200 } as DOMRect);
    vi.stubGlobal('scrollY', 300);
    vi.stubGlobal('getComputedStyle', vi.fn().mockReturnValue({ scrollMarginTop: '70px' }));

    document.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(lenisScrollToMock).toHaveBeenCalledWith(1430, expect.objectContaining({ onComplete: expect.any(Function) }));
  });

  it('keeps native scrolling when reduced motion is requested', () => {
    stubReducedMotion(true);

    initSmoothScroll();

    expect(LenisMock).not.toHaveBeenCalled();
  });

  it('replaces the active inertial target when returning to the top', () => {
    stubReducedMotion(false);
    initSmoothScroll();

    scrollPageToTop();

    expect(lenisScrollToMock).toHaveBeenCalledWith(0, { force: true });
  });

  it('falls back to an instant native scroll with reduced motion', () => {
    stubReducedMotion(true);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    initSmoothScroll();

    scrollPageToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
