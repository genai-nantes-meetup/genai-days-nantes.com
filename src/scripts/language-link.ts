/* Les pages sont statiques : le lien vers l'autre langue ne connaît que le
 * chemin. On y reporte la requête et l'ancre courantes (parcours filtré du
 * programme, section visée) pour basculer sans perdre sa place. Les ids et
 * les paramètres sont identiques dans les deux langues. */
export function initLanguageLinks(): void {
  const { search, hash } = window.location;
  if (!search && !hash) return;

  document.querySelectorAll<HTMLAnchorElement>('a[data-language-switch]').forEach((link) => {
    const destination = new URL(link.href, window.location.href);
    destination.search = search;
    destination.hash = hash;
    link.href = destination.href;
  });
}
