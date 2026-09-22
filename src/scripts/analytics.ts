import { capture } from '../lib/analytics';
import { CTA_LINKS } from '../lib/cta-links';

/* Un seul listener délégué plutôt qu'un par CTA : les liens billetterie
 * apparaissent à plusieurs endroits (header desktop, header mobile, section
 * CTA, story éditoriale) et sont identifiés par leur destination, pas par un
 * attribut data-* dédié qui n'existe pas sur ces composants. */
export function initAnalytics(): void {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;

    if (link.href === CTA_LINKS.tickets) {
      capture('ticket_cta_clicked');
    }
  });
}
