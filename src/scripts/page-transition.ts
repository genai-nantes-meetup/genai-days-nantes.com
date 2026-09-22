const EXIT_DURATION_MS = 680;
const REVEAL_DELAY_MS = 80;
const REVEAL_DURATION_MS = 760;
const TRANSITION_STORAGE_KEY = 'genaidays:page-transition:v1';

let isBound = false;
let navigationTimer = 0;
let revealTimer = 0;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const normalizeDestination = (url: URL): string => {
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  return `${pathname}${url.search}${url.hash}`;
};

const clearTransitionState = (): void => {
  window.clearTimeout(navigationTimer);
  window.clearTimeout(revealTimer);
  delete document.documentElement.dataset.pageTransition;
};

const alignHashTarget = (): void => {
  if (!window.location.hash) return;

  let targetId = '';
  try {
    targetId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }

  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) return;

  /* L'aplat reste fermé pendant le recalage. La destination apparaît donc
   * directement au bon endroit, sans exposer le haut de la nouvelle page. */
  target.scrollIntoView({ behavior: 'auto', block: 'start' });
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
};

const revealDestination = (): void => {
  const root = document.documentElement;
  if (root.dataset.pageTransition !== 'entering') return;

  alignHashTarget();
  window.requestAnimationFrame(() => {
    revealTimer = window.setTimeout(() => {
      root.dataset.pageTransition = 'revealing';
      revealTimer = window.setTimeout(clearTransitionState, REVEAL_DURATION_MS);
    }, REVEAL_DELAY_MS);
  });
};

const isPlainPrimaryClick = (event: MouseEvent): boolean =>
  event.button === 0
  && !event.metaKey
  && !event.ctrlKey
  && !event.shiftKey
  && !event.altKey;

const rememberDestination = (destination: URL): void => {
  try {
    window.sessionStorage.setItem(TRANSITION_STORAGE_KEY, normalizeDestination(destination));
  } catch {
    /* La navigation reste fonctionnelle quand le stockage est indisponible.
     * Seule la révélation symétrique de la page suivante est alors omise. */
  }
};

export function navigateWithPageTransition(href: string | URL): void {
  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin || prefersReducedMotion()) {
    window.location.assign(destination.href);
    return;
  }

  const root = document.documentElement;
  if (root.dataset.pageTransition === 'leaving') return;

  rememberDestination(destination);
  root.dataset.pageTransition = 'leaving';
  navigationTimer = window.setTimeout(() => {
    window.location.assign(destination.href);
  }, EXIT_DURATION_MS);
}

export function initPageTransition(): void {
  revealDestination();
  if (isBound) return;
  isBound = true;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || !isPlainPrimaryClick(event)) return;

    const clicked = event.target;
    if (!(clicked instanceof Element)) return;

    const link = clicked.closest<HTMLAnchorElement>('a[href]');
    if (
      !link
      || link.hasAttribute('download')
      || link.hasAttribute('data-no-page-transition')
      || (link.target && link.target !== '_self')
    ) return;

    const destination = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    const destinationPath = destination.pathname.replace(/\/+$/, '') || '/';
    const currentPath = current.pathname.replace(/\/+$/, '') || '/';
    const isInternalPageChange = destination.origin === current.origin
      && (destinationPath !== currentPath || destination.search !== current.search);
    if (!isInternalPageChange || prefersReducedMotion()) return;

    event.preventDefault();
    navigateWithPageTransition(destination);
  });

  /* Une page restaurée depuis le cache précédent/suivant conserve son DOM.
   * Un éventuel aplat de sortie doit alors disparaître immédiatement. */
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) clearTransitionState();
  });
}
