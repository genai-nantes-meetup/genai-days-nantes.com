// Filtre à deux boutons, pas un motif d'onglets : le panneau reste le même
// document aux deux largeurs et il redevient visible en entier au-dessus de
// 40rem, donc l'état à annoncer est « ce bouton est enfoncé », pas « cet
// onglet est sélectionné ».
// Le parcours peut être présélectionné par l'URL (`/programme?parcours=tech`)
// pour que les liens de la page d'accueil ouvrent directement le bon planning.
const TRACK_QUERY_PARAM = 'parcours';

function readRequestedTrack(search: string): string | null {
  return new URLSearchParams(search).get(TRACK_QUERY_PARAM);
}

export function initScheduleTabs(
  root: ParentNode = document,
  search: string = typeof window === 'undefined' ? '' : window.location.search,
): number {
  const groups = root.querySelectorAll<HTMLElement>('[data-schedule-tabs]');
  const requestedTrack = readRequestedTrack(search);

  groups.forEach((group) => {
    const trackFilters = [...group.querySelectorAll<HTMLButtonElement>('[data-schedule-tab]')];
    const panel = group.querySelector<HTMLElement>('[data-schedule-panel]');

    if (trackFilters.length === 0 || !panel) return;

    const showTrack = (filter: HTMLButtonElement) => {
      const track = filter.dataset.scheduleTab;
      if (!track) return;

      group.dataset.activeTrack = track;

      trackFilters.forEach((candidate) => {
        candidate.setAttribute('aria-pressed', String(candidate === filter));
      });
    };

    trackFilters.forEach((filter) => {
      filter.addEventListener('click', () => showTrack(filter));
    });

    const requestedFilter = trackFilters.find((filter) => filter.dataset.scheduleTab === requestedTrack);
    if (requestedFilter) showTrack(requestedFilter);
  });

  return groups.length;
}
