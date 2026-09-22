// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSpeakerCarousels } from '../../src/scripts/speaker-carousel';

describe('initSpeakerCarousels', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section data-speaker-carousel>
        <button data-speaker-previous></button>
        <button data-speaker-next></button>
        <div data-speaker-viewport tabindex="0">
          <article data-speaker-slide></article>
          <article data-speaker-slide></article>
          <article data-speaker-slide></article>
          <article data-speaker-slide></article>
        </div>
        <span data-speaker-status></span>
        <i data-speaker-segment></i>
        <i data-speaker-segment></i>
        <i data-speaker-segment></i>
        <i data-speaker-segment></i>
      </section>
    `;

    const viewport = document.querySelector<HTMLElement>('[data-speaker-viewport]')!;
    const slides = [...document.querySelectorAll<HTMLElement>('[data-speaker-slide]')];
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 600 });
    Object.defineProperty(viewport, 'scrollLeft', { configurable: true, value: 0, writable: true });

    slides.forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: index * 300 });
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 300 });
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });

    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
    });

    viewport.scrollTo = vi.fn(({ left }: ScrollToOptions) => {
      viewport.scrollLeft = Number(left ?? 0);
      viewport.dispatchEvent(new Event('scroll'));
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('reports the visible range and loops through groups', () => {
    expect(initSpeakerCarousels()).toBe(1);
    const status = document.querySelector<HTMLElement>('[data-speaker-status]');
    const previous = document.querySelector<HTMLButtonElement>('[data-speaker-previous]');
    const next = document.querySelector<HTMLButtonElement>('[data-speaker-next]');

    expect(status?.textContent).toBe('Diapositives 1 à 2 sur 4. Carrousel en boucle.');
    expect(previous?.disabled).toBe(false);

    next?.click();

    expect(status?.textContent).toBe('Diapositives 3 à 4 sur 4. Carrousel en boucle.');
    expect(previous?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);

    next?.click();
    expect(status?.textContent).toBe('Diapositives 1 à 2 sur 4. Carrousel en boucle.');

    previous?.click();
    expect(status?.textContent).toBe('Diapositives 3 à 4 sur 4. Carrousel en boucle.');
  });

  it('supports arrow-key navigation from the viewport', () => {
    initSpeakerCarousels();
    const viewport = document.querySelector<HTMLElement>('[data-speaker-viewport]');

    viewport?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.querySelector<HTMLElement>('[data-speaker-status]')?.textContent).toBe('Diapositives 3 à 4 sur 4. Carrousel en boucle.');
  });
});
