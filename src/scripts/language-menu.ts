/* Comportement des sélecteurs de langue du header (<details>) : fermeture au
 * clic hors du menu, à l'Escape et quand le focus le quitte ; un seul menu
 * ouvert à la fois, et jamais en même temps que le volet Menu / Explorer. */
export function initLanguageMenus(): void {
  const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-language-menu]'));
  if (menus.length === 0) return;

  carryLocationToLanguageLinks();

  /* Le clic qui referme le volet Menu est synthétique et remonte jusqu'au
   * document : il ne doit pas refermer le sélecteur qui vient de s'ouvrir. */
  let isClosingHeaderMenu = false;

  menus.forEach((menu) => {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      menus.forEach((other) => {
        if (other !== menu) other.open = false;
      });
      const headerMenuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle][aria-expanded="true"]');
      if (headerMenuToggle) {
        isClosingHeaderMenu = true;
        headerMenuToggle.click();
        isClosingHeaderMenu = false;
      }
    });

    menu.addEventListener('focusout', (event) => {
      if (!menu.contains(event.relatedTarget as Node | null)) menu.open = false;
    });
  });

  document.addEventListener('click', (event) => {
    if (isClosingHeaderMenu) return;
    menus.forEach((menu) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menus.forEach((menu) => {
      if (!menu.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    });
  });
}

/* Les pages sont statiques : le lien vers l'autre langue ne connaît que le
 * chemin. On y reporte la requête et l'ancre courantes (parcours filtré du
 * programme, section visée) pour basculer sans perdre sa place. Les ids et
 * les paramètres sont identiques dans les deux langues. */
function carryLocationToLanguageLinks(): void {
  const { search, hash } = window.location;
  if (!search && !hash) return;

  document.querySelectorAll<HTMLAnchorElement>('a[data-language-switch]').forEach((link) => {
    const destination = new URL(link.href, window.location.href);
    destination.search = search;
    destination.hash = hash;
    link.href = destination.href;
  });
}
