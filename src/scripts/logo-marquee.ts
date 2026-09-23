export function initLogoMarquees(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-logo-marquee]').forEach((marquee) => {
    if (marquee.dataset.logoMarqueeReady === 'true') return;

    const toggle = marquee.querySelector<HTMLButtonElement>('[data-logo-marquee-toggle]');
    if (!toggle) return;

    marquee.dataset.logoMarqueeReady = 'true';
    toggle.addEventListener('click', () => {
      const paused = marquee.dataset.paused !== 'true';
      marquee.dataset.paused = String(paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Reprendre le défilement des logos' : 'Mettre en pause le défilement des logos');
    });
  });
}
