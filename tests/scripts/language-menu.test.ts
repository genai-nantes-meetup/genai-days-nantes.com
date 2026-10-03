// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initLanguageMenus } from '../../src/scripts/language-menu';

const menuMarkup = (id: string) => `
  <details data-language-menu id="${id}">
    <summary>FR</summary>
    <ul>
      <li><a href="/programme" aria-current="true">Français</a></li>
      <li><a href="/en/program" data-language-switch>English</a></li>
    </ul>
  </details>
`;

describe('initLanguageMenus', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/programme');
    document.body.innerHTML = `
      <header>
        ${menuMarkup('compact')}
        <button data-menu-toggle aria-expanded="false"></button>
        ${menuMarkup('desktop')}
      </header>
      <main><p>Contenu</p></main>
    `;
    const headerToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    headerToggle.addEventListener('click', () => {
      headerToggle.setAttribute('aria-expanded', headerToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
  });

  const open = (menu: HTMLDetailsElement) => {
    menu.open = true;
    menu.dispatchEvent(new Event('toggle'));
  };

  it('keeps a single menu open and closes the header menu panel', () => {
    initLanguageMenus();
    const compact = document.querySelector<HTMLDetailsElement>('#compact')!;
    const desktop = document.querySelector<HTMLDetailsElement>('#desktop')!;
    const headerToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')!;
    headerToggle.setAttribute('aria-expanded', 'true');

    open(compact);
    open(desktop);

    expect(desktop.open).toBe(true);
    expect(compact.open).toBe(false);
    expect(headerToggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on a click outside and on Escape, returning focus to the toggle', () => {
    initLanguageMenus();
    const desktop = document.querySelector<HTMLDetailsElement>('#desktop')!;

    open(desktop);
    desktop.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(desktop.open).toBe(true);
    document.querySelector('main')!.click();
    expect(desktop.open).toBe(false);

    open(desktop);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(desktop.open).toBe(false);
    expect(document.activeElement).toBe(desktop.querySelector('summary'));
  });

  it('carries the current query and anchor over to the other language', () => {
    window.history.replaceState(null, '', '/programme?parcours=tech#creneau-1000');
    initLanguageMenus();

    const english = document.querySelector<HTMLAnchorElement>('#desktop a[data-language-switch]')!;
    expect(english.getAttribute('href')).toBe('http://localhost:3000/en/program?parcours=tech#creneau-1000');
    expect(document.querySelector('#desktop a[aria-current]')!.getAttribute('href')).toBe('/programme');
  });
});
