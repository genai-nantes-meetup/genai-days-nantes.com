// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initHeaderMenu } from '../../src/scripts/header-menu';

describe('initHeaderMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <button data-menu-toggle aria-expanded="false"></button>
        <div data-menu-panel data-menu-state="closed" data-menu-view="sections" aria-hidden="true" inert>
          <button data-menu-directory-open>Explorer le site</button>
          <button data-menu-directory-close>L’événement</button>
          <a href="/programme">Programme</a>
        </div>
      </header>
    `;
  });

  it('opens, changes level and closes with Escape', () => {
    initHeaderMenu();

    const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    const panel = document.querySelector<HTMLElement>('[data-menu-panel]')!;
    const directoryOpen = document.querySelector<HTMLButtonElement>('[data-menu-directory-open]')!;
    const directoryClose = document.querySelector<HTMLButtonElement>('[data-menu-directory-close]')!;

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.dataset.menuState).toBe('open');
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(panel.hasAttribute('inert')).toBe(false);

    directoryOpen.click();
    expect(panel.dataset.menuView).toBe('directory');
    expect(document.activeElement).toBe(directoryClose);

    directoryClose.click();
    expect(panel.dataset.menuView).toBe('sections');
    expect(document.activeElement).toBe(directoryOpen);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.dataset.menuState).toBe('closed');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });
});
