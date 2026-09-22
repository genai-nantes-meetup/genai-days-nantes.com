// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initPageTransition } from '../../src/scripts/page-transition';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  document.documentElement.removeAttribute('data-page-transition');
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

describe('initPageTransition', () => {
  it('covers the full app before any internal page change', () => {
    window.history.replaceState({}, '', '/programme');
    document.body.innerHTML = '<a href="/speakers/nicolas-martignole">Nicolas Martignole</a>';
    initPageTransition();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.documentElement.dataset.pageTransition).toBe('leaving');
    expect(window.sessionStorage.getItem('genaidays:page-transition:v1'))
      .toBe('/speakers/nicolas-martignole');
  });

  it('keeps same-page anchors native', () => {
    window.history.replaceState({}, '', '/confidentialite');
    document.body.innerHTML = '<a href="/confidentialite#donnees-personnelles">Données personnelles</a>';
    initPageTransition();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.documentElement.dataset.pageTransition).toBeUndefined();
  });

  it('keeps external, downloaded, and modified links native', () => {
    window.history.replaceState({}, '', '/programme');
    document.body.innerHTML = `
      <a id="external" href="https://example.org">Externe</a>
      <a id="download" href="/press/kit.zip" download>Télécharger</a>
      <a id="modified" href="/speakers">Intervenants</a>
    `;
    initPageTransition();

    const external = new MouseEvent('click', { bubbles: true, cancelable: true });
    const download = new MouseEvent('click', { bubbles: true, cancelable: true });
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    document.getElementById('external')?.dispatchEvent(external);
    document.getElementById('download')?.dispatchEvent(download);
    document.getElementById('modified')?.dispatchEvent(modified);

    expect(external.defaultPrevented).toBe(false);
    expect(download.defaultPrevented).toBe(false);
    expect(modified.defaultPrevented).toBe(false);
    expect(document.documentElement.dataset.pageTransition).toBeUndefined();
  });

  it('keeps internal navigation immediate when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    window.history.replaceState({}, '', '/programme');
    document.body.innerHTML = '<a href="/speakers">Intervenants</a>';
    initPageTransition();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.documentElement.dataset.pageTransition).toBeUndefined();
    expect(window.sessionStorage.getItem('genaidays:page-transition:v1')).toBeNull();
  });

  it('positions an anchored destination before revealing the page', () => {
    window.history.replaceState({}, '', '/#speakers');
    document.documentElement.dataset.pageTransition = 'entering';
    document.body.innerHTML = '<section id="speakers"></section>';
    const section = document.getElementById('speakers') as HTMLElement;
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;

    initPageTransition();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(document.activeElement).toBe(section);
    expect(document.documentElement.dataset.pageTransition).toBe('entering');

    vi.advanceTimersByTime(80);
    expect(document.documentElement.dataset.pageTransition).toBe('revealing');

    vi.advanceTimersByTime(760);
    expect(document.documentElement.dataset.pageTransition).toBeUndefined();
  });

  it('reveals destinations without a hash using the same timing', () => {
    window.history.replaceState({}, '', '/programme');
    document.documentElement.dataset.pageTransition = 'entering';
    initPageTransition();

    vi.advanceTimersByTime(80);
    expect(document.documentElement.dataset.pageTransition).toBe('revealing');

    vi.advanceTimersByTime(760);
    expect(document.documentElement.dataset.pageTransition).toBeUndefined();
  });
});
