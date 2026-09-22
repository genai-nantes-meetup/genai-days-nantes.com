/*
 * Chorégraphie du header sur la landing, indexée sur le scroll.
 *
 * Le header et la billetterie restent présents pendant tout le parcours.
 * La SURFACE (fond, bordure) apparaît progressivement avant la sortie du
 * hero. L'ENCRE bascule une fois qu'elle est assez opaque pour garantir la
 * lisibilité. La hauteur et le padding ne changent jamais.
 *
 */

/* La surface crème attend que le front de dissolution approche réellement
 * du header. Le fondu commence en fin de premier viewport et s'achève juste
 * après sa sortie, quand l'aplat crème prend le relais de l'affiche. */
const SURFACE_START_VIEWPORT_RATIO = 0.86;
const SURFACE_END_VIEWPORT_RATIO = 1.08;
const INK_SWITCH_SURFACE = 0.64;
const SURFACED_THRESHOLD = 0.92;

export function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;
  const mobileTicketCta = document.querySelector<HTMLElement>('.mobile-ticket-cta--poster');

  const hasImmersiveHero = Boolean(document.querySelector('.hero-affiche'));
  if (!hasImmersiveHero) {
    header.classList.remove('is-immersed');
    header.classList.add('is-surfaced');
    header.style.setProperty('--header-surface', '1');
    return;
  }

  const sync = (): void => {
    const scrollY = window.scrollY;
    const viewportHeight = document.documentElement.clientHeight;

    const start = viewportHeight * SURFACE_START_VIEWPORT_RATIO;
    const end = viewportHeight * SURFACE_END_VIEWPORT_RATIO;
    const surface = Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)));
    header.style.setProperty('--header-surface', surface.toFixed(4));
    header.classList.toggle('is-immersed', surface < INK_SWITCH_SURFACE);
    header.classList.toggle('is-surfaced', surface >= SURFACED_THRESHOLD);
    mobileTicketCta?.style.setProperty(
      '--mobile-cta-shadow',
      surface >= SURFACED_THRESHOLD ? 'var(--color-brand-blue)' : 'var(--color-brand-cream)',
    );
  };

  sync();
  window.addEventListener('scroll', sync, { passive: true });
  /* Les seuils sont indexés sur la hauteur du viewport : une rotation ou un
   * redimensionnement déplace la sortie du hero sans émettre de scroll. */
  window.addEventListener('resize', sync, { passive: true });
}
