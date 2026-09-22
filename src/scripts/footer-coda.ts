const TICKET_HORIZON_RATIO = 0.7;

function initTicketFooterHorizon(): void {
  const section = document.querySelector<HTMLElement>('.ticket-field');
  const ticket = section?.querySelector<HTMLElement>('.admission-ticket');
  const footer = document.querySelector<HTMLElement>('.site-footer');
  if (!section || !ticket || !footer || footer.dataset.ticketHorizonReady === 'true') return;

  footer.dataset.ticketHorizonReady = 'true';
  let animationFrame = 0;

  const sync = (): void => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(() => {
      const sectionRect = section.getBoundingClientRect();
      const ticketRect = ticket.getBoundingClientRect();
      const horizon = ticketRect.top + ticketRect.height * TICKET_HORIZON_RATIO;
      const overlap = Math.max(0, sectionRect.bottom - horizon);

      footer.style.setProperty('--ticket-footer-overlap', `${overlap.toFixed(2)}px`);
    });
  };

  sync();

  const resizeObserver = new ResizeObserver(sync);
  resizeObserver.observe(section);
  resizeObserver.observe(ticket);
}

export function initFooterCoda(): void {
  initTicketFooterHorizon();

  const stages = document.querySelectorAll<HTMLElement>('[data-footer-coda]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  stages.forEach((stage) => {
    if (reducedMotion) return;

    stage.classList.add('is-coda-ready');

    const frame = stage.querySelector<HTMLElement>('.site-footer__frame');
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;

      window.requestAnimationFrame(() => {
        frame?.addEventListener('transitionend', () => {
          stage.classList.remove('is-coda-ready');
        }, { once: true });
        stage.classList.add('is-revealed');
      });
      observer.unobserve(stage);
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    });

    observer.observe(stage);
  });
}
