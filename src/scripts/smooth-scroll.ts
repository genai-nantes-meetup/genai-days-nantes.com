import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let smoothScroll: Lenis | null = null;
let isReducedMotionWatched = false;
let isAnchorHandlerBound = false;

/*
 * Position de dépôt d'une ancre, calculée sur le document plutôt que déléguée
 * à Lenis : son option `anchors` visait la cible à environ mille pixels trop
 * haut sur les pages longues (mesuré à 978px sur /press-kit#essentiel et
 * 1014px sur #programme, contre 0 en scroll natif), si bien que la section
 * cliquée finissait sous la ligne de flottaison. Un nombre absolu ne peut pas
 * être réinterprété, contrairement à un élément.
 *
 * Le scroll-margin-top de la cible porte déjà la réserve du header collant :
 * on le lit sur l'élément au lieu de le redéclarer ici.
 */
function anchorScrollTarget(element: Element): number {
  const reserve = Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0;
  return element.getBoundingClientRect().top + window.scrollY - reserve;
}

/*
 * Inertie de scroll façon lamalama : Lenis interpole le scroll réel du
 * document vers la position visée, ce qui produit le glissé et sa légère
 * traîne après un geste à la molette ou au trackpad. Le document conserve
 * son scroll natif : les éléments sticky et les lectures de window.scrollY
 * restent synchronisés avec la trame et les interactions de la landing.
 *
 * Les ancres utilisent la même inertie. Avec prefers-reduced-motion, Lenis
 * n'est pas monté et le navigateur garde son comportement natif.
 *
 * La préférence est réévaluée à chaud : le site ne rechargeant jamais son
 * document, un lecteur qui active « Réduire les animations » en cours de
 * session garderait sinon sa glisse interpolée jusqu'à la prochaine visite.
 * La fonction détruit l'instance en tête, elle est donc idempotente dans les
 * deux sens.
 */
export function initSmoothScroll(): void {
  smoothScroll?.destroy();
  smoothScroll = null;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Un seul abonnement pour toute la vie du document, quel que soit le
   * nombre d'appels : sinon chaque bascule empilerait un écouteur de plus. */
  if (!isReducedMotionWatched) {
    isReducedMotionWatched = true;
    reducedMotionQuery.addEventListener?.('change', () => initSmoothScroll());
  }

  /* Un seul écouteur d'ancre pour la vie du document : il délègue à Lenis
   * quand l'inertie est montée, et laisse le navigateur faire sinon. */
  if (!isAnchorHandlerBound) {
    isAnchorHandlerBound = true;
    document.addEventListener('click', (event) => {
      if (!smoothScroll) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return;

      const id = link.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      /* Recalage à l'arrivée : sur les pages longues la mise en page bouge de
       * quelques pixels entre le clic et la fin de la course (mesuré à 24px
       * sur /press-kit). La position visée est donc reprise une fois posée,
       * et le rattrapage n'a lieu que s'il dépasse le pixel. */
      smoothScroll.scrollTo(anchorScrollTarget(target), {
        onComplete: () => {
          const corrige = anchorScrollTarget(target);
          if (Math.abs(corrige - window.scrollY) > 1) smoothScroll?.scrollTo(corrige, { immediate: true });
        },
      });
      /* Le saut d'ancre natif déplace aussi le focus : sans ce relais, la
       * tabulation reprendrait au début du document. */
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.pushState(null, '', `#${id}`);
    });
  }

  if (reducedMotionQuery.matches) return;

  smoothScroll = new Lenis({
    autoRaf: true,
    anchors: false,
    lerp: 0.1,
    smoothWheel: true,
  });
}

/** Remplace la cible Lenis en cours pour que l'inertie ne puisse pas
 * reprendre la main après un clic de remontée. */
export function scrollPageToTop(): void {
  if (smoothScroll) {
    smoothScroll.scrollTo(0, { force: true });
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
}
