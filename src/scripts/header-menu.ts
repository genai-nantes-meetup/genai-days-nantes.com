/**
 * Toggle du panneau de navigation du header : menu complet sur mobile,
 * index Explorer sur grand écran. Fermeture au clic sur un lien, à l'Escape
 * ou au clic hors du header.
 */
export function initHeaderMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!toggle || !panel) return;

  const directoryOpen = panel.querySelector<HTMLButtonElement>('[data-menu-directory-open]');
  const directoryClose = panel.querySelector<HTMLButtonElement>('[data-menu-directory-close]');

  const setDirectoryView = (open: boolean): void => {
    panel.dataset.menuView = open ? 'directory' : 'sections';
    if (open) {
      directoryClose?.focus({ preventScroll: true });
    } else {
      directoryOpen?.focus({ preventScroll: true });
    }
  };

  const isOpen = (): boolean => panel.dataset.menuState === 'open';

  /* Fermer le panneau retire l'élément focalisé du rendu : sans retour
   * explicite vers le bouton MENU, le focus retombe sur body et la reprise
   * du Tab dépend du moteur. Le retour est réservé à l'Escape ; sur un clic
   * de lien ou hors du header, la destination du geste garde le focus. */
  const close = (returnFocusToToggle = false): void => {
    if (!isOpen()) return;
    panel.dataset.menuState = 'closed';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocusToToggle) toggle.focus();
  };

  toggle.addEventListener('click', () => {
    const willOpen = !isOpen();
    if (willOpen) {
      panel.dataset.menuView = 'sections';
      panel.dataset.menuState = 'open';
      panel.setAttribute('aria-hidden', 'false');
      panel.removeAttribute('inert');
    } else {
      close();
    }
    toggle.setAttribute('aria-expanded', String(willOpen));
  });

  panel.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-menu-directory-open]')) {
      setDirectoryView(true);
      return;
    }
    if (target.closest('[data-menu-directory-close]')) {
      setDirectoryView(false);
      return;
    }
    if (target.closest('a')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close(true);
  });

  document.addEventListener('click', (event) => {
    if (!(event.target as HTMLElement).closest('header')) close();
  });
}
