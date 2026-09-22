const POINTER_INTENT_DISTANCE = 2;

let disposeCurrentIssueIndex: (() => void) | null = null;

export function initIssueIndex(): void {
  const section = document.querySelector<HTMLElement>('[data-issue-index]');
  if (!section || section.dataset.issueIndexReady === 'true') return;

  const triggers = Array.from(section.querySelectorAll<HTMLButtonElement>('[data-issue-trigger]'));
  const visuals = Array.from(section.querySelectorAll<HTMLElement>('[data-issue-visual]'));
  const rows = triggers.map((trigger) => trigger.closest<HTMLLIElement>('li'));
  if (triggers.length === 0 || visuals.length !== triggers.length) return;

  disposeCurrentIssueIndex?.();

  const controller = new AbortController();
  const { signal } = controller;

  section.dataset.issueIndexReady = 'true';
  let currentIndex = Math.max(0, triggers.findIndex((trigger) => trigger.getAttribute('aria-pressed') === 'true'));
  let transitionTimer = 0;
  let hoverArmed = true;
  let lastPointerX: number | null = null;
  let lastPointerY: number | null = null;

  const playTransition = (visual: HTMLElement): void => {
    visuals.forEach((candidate) => candidate.classList.remove('is-entering'));
    section.classList.remove('is-transitioning');
    window.clearTimeout(transitionTimer);

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    void section.offsetWidth;
    visual.classList.add('is-entering');
    section.classList.add('is-transitioning');
    transitionTimer = window.setTimeout(() => {
      visual.classList.remove('is-entering');
      section.classList.remove('is-transitioning');
    }, 680);
  };

  const setActive = (activeIndex: number): void => {
    if (activeIndex === currentIndex) return;

    section.dataset.issueDirection = activeIndex > currentIndex ? 'forward' : 'backward';
    currentIndex = activeIndex;

    triggers.forEach((trigger, index) => {
      const isActive = index === activeIndex;
      trigger.setAttribute('aria-pressed', String(isActive));
      rows[index]?.setAttribute('data-active', String(isActive));
    });

    visuals.forEach((visual, index) => {
      const isActive = index === activeIndex;
      visual.dataset.active = String(isActive);
      visual.setAttribute('aria-hidden', String(!isActive));
    });

    const activeVisual = visuals[activeIndex];
    if (activeVisual) playTransition(activeVisual);
  };

  const handleScroll = (): void => {
    hoverArmed = false;
    lastPointerX = null;
    lastPointerY = null;
  };

  window.addEventListener('scroll', handleScroll, { passive: true, signal });

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;

      if (!hoverArmed) {
        hoverArmed = true;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        return;
      }

      if (lastPointerX === null || lastPointerY === null) {
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        return;
      }

      const pointerDistance = Math.hypot(event.clientX - lastPointerX, event.clientY - lastPointerY);
      if (pointerDistance < POINTER_INTENT_DISTANCE) return;

      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      setActive(index);
    }, { signal });

    trigger.addEventListener('pointerleave', () => {
      lastPointerX = null;
      lastPointerY = null;
    }, { signal });

    trigger.addEventListener('focus', () => {
      setActive(index);
      /* Le navigateur a deja fait defiler la page quand le repli du visuel
       * precedent raccourcit le contenu situe au-dessus du bouton : sans ce
       * rattrapage, le bouton focalise finit hors du viewport ou sous le
       * header collant. Les scroll-margin du bouton reservent la place des
       * deux barres fixes. */
      trigger.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
    }, { signal });

    trigger.addEventListener('click', () => setActive(index), { signal });
  });

  disposeCurrentIssueIndex = () => {
    controller.abort();
    window.clearTimeout(transitionTimer);
  };
}
