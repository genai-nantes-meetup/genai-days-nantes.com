export function initSpeakerCarousels(root: ParentNode = document): number {
  const carousels = root.querySelectorAll<HTMLElement>('[data-speaker-carousel]');

  carousels.forEach((carousel) => {
    if (carousel.dataset.speakerCarouselReady === 'true') return;

    const viewport = carousel.querySelector<HTMLElement>('[data-speaker-viewport]');
    const slides = [...carousel.querySelectorAll<HTMLElement>('[data-speaker-slide]')];
    const previous = carousel.querySelector<HTMLButtonElement>('[data-speaker-previous]');
    const next = carousel.querySelector<HTMLButtonElement>('[data-speaker-next]');
    const status = carousel.querySelector<HTMLElement>('[data-speaker-status]');
    const segments = [...carousel.querySelectorAll<HTMLElement>('[data-speaker-segment]')];

    if (!viewport || slides.length === 0 || !previous || !next || !status) return;

    carousel.dataset.speakerCarouselReady = 'true';

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let frame = 0;

    const slideStep = () => {
      if (slides.length < 2) return slides[0]?.offsetWidth || viewport.clientWidth;
      return slides[1].offsetLeft - slides[0].offsetLeft;
    };

    const visibleSlides = () => {
      const step = slideStep();
      return step > 0 ? Math.max(1, Math.round(viewport.clientWidth / step)) : 1;
    };

    const currentSlide = () => {
      const step = slideStep();
      const maximum = Math.max(0, slides.length - visibleSlides());
      if (step <= 0) return 0;
      return Math.min(maximum, Math.max(0, Math.round(viewport.scrollLeft / step)));
    };

    const update = () => {
      const first = currentSlide();
      const visible = visibleSlides();
      const last = Math.min(slides.length, first + visible);
      const canMove = slides.length > visible;

      status.textContent = `Diapositives ${first + 1} à ${last} sur ${slides.length}. Carrousel en boucle.`;
      previous.disabled = !canMove;
      next.disabled = !canMove;

      segments.forEach((segment, index) => {
        segment.dataset.active = String(index >= first && index < last);
      });
    };

    const move = (direction: -1 | 1) => {
      const first = currentSlide();
      const visible = visibleSlides();
      const maximum = Math.max(0, slides.length - visible);
      const target = direction === 1
        ? first >= maximum ? 0 : Math.min(maximum, first + visible)
        : first <= 0 ? maximum : Math.max(0, first - visible);

      viewport.scrollTo({
        left: slides[target]?.offsetLeft ?? 0,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    };

    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));

    // Les fleches ne pilotent le carrousel que depuis le viewport lui-meme : depuis un lien
    // de carte, elles feraient glisser le rail sous un focus reste en place, donc hors champ.
    viewport.addEventListener('keydown', (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });

    // Le scroll-snap ramene le rail sur la carte precedente quand le navigateur amene de
    // lui-meme un lien focalise dans le champ : on aligne explicitement sur sa carte.
    viewport.addEventListener('focusin', (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const focusedSlide = event.target.closest<HTMLElement>('[data-speaker-slide]');
      if (!focusedSlide) return;

      const slideStart = focusedSlide.offsetLeft;
      const slideEnd = slideStart + focusedSlide.offsetWidth;
      const isSlideInView = slideStart >= viewport.scrollLeft - 1
        && slideEnd <= viewport.scrollLeft + viewport.clientWidth + 1;
      if (isSlideInView) return;

      viewport.scrollTo({
        left: slideStart,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    });

    viewport.addEventListener('scroll', () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    }, { passive: true });

    if ('ResizeObserver' in window) {
      new ResizeObserver(update).observe(viewport);
    }

    update();
  });

  return carousels.length;
}
