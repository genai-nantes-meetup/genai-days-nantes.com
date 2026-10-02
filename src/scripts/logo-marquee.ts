import { getDocumentLocale } from '../lib/i18n';

const messages = {
  fr: { pause: 'Mettre en pause le défilement des logos', resume: 'Reprendre le défilement des logos' },
  en: { pause: 'Pause the scrolling logos', resume: 'Resume the scrolling logos' },
};

export function initLogoMarquees(root: ParentNode = document): void {
  const copy = messages[getDocumentLocale()];

  root.querySelectorAll<HTMLElement>('[data-logo-marquee]').forEach((marquee) => {
    if (marquee.dataset.logoMarqueeReady === 'true') return;

    const toggle = marquee.querySelector<HTMLButtonElement>('[data-logo-marquee-toggle]');
    if (!toggle) return;

    marquee.dataset.logoMarqueeReady = 'true';
    toggle.addEventListener('click', () => {
      const paused = marquee.dataset.paused !== 'true';
      marquee.dataset.paused = String(paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? copy.resume : copy.pause);
    });
  });
}
