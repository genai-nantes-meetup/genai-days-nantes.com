import { scrollPageToTop } from './smooth-scroll';

/**
 * Les wordmarks conservent leur rôle de lien vers l'accueil depuis les
 * pages internes. Sur l'accueil, ils partagent la remontée progressive du
 * bouton flottant sans recharger le document.
 */
export function initScrollTop(): void {
  document.querySelectorAll<HTMLElement>('[data-scroll-top]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      if (trigger instanceof HTMLAnchorElement && window.location.pathname !== '/') return;
      event.preventDefault();
      scrollPageToTop();
    });
  });
}
