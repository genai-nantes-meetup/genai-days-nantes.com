// Filtre à trois boutons, pas un motif d'onglets : les panneaux sont des
// articles autonomes que le filtre montre ou masque, donc l'état à annoncer
// est « ce bouton est enfoncé », pas « cet onglet est sélectionné ». Même
// traitement que le filtre de parcours du planning.
export function initCommunityProof(root: ParentNode = document): number {
  const sections = root.querySelectorAll<HTMLElement>('[data-community-proof]');

  sections.forEach((section) => {
    if (section.dataset.communityProofReady === 'true') return;

    const communityFilters = [...section.querySelectorAll<HTMLButtonElement>('[data-community-tab]')];
    const panels = [...section.querySelectorAll<HTMLElement>('[data-community-panel]')];

    section.dataset.communityProofReady = 'true';

    const showCommunity = (id: string) => {
      communityFilters.forEach((filter) => {
        filter.setAttribute('aria-pressed', String(filter.dataset.communityTab === id));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.communityPanel !== id;
      });
    };

    communityFilters.forEach((filter) => {
      filter.addEventListener('click', () => {
        const id = filter.dataset.communityTab;
        if (id) showCommunity(id);
      });
    });
  });

  return sections.length;
}
