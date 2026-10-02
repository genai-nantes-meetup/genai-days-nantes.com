// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initLogoMarquees } from '../../src/scripts/logo-marquee';

describe('initLogoMarquees', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-logo-marquee>
        <button data-logo-marquee-toggle aria-pressed="false"></button>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('lang');
  });

  it('pauses the scroll and offers to resume it', () => {
    initLogoMarquees();
    const toggle = document.querySelector<HTMLButtonElement>('[data-logo-marquee-toggle]');
    toggle?.click();

    expect(document.querySelector<HTMLElement>('[data-logo-marquee]')?.dataset.paused).toBe('true');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    expect(toggle?.getAttribute('aria-label')).toBe('Reprendre le défilement des logos');
  });

  it('labels the toggle in English on English pages', () => {
    document.documentElement.lang = 'en';
    initLogoMarquees();
    const toggle = document.querySelector<HTMLButtonElement>('[data-logo-marquee-toggle]');

    toggle?.click();
    expect(toggle?.getAttribute('aria-label')).toBe('Resume the scrolling logos');

    toggle?.click();
    expect(toggle?.getAttribute('aria-label')).toBe('Pause the scrolling logos');
  });
});
