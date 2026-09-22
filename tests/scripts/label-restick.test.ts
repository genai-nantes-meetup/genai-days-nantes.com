// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initLabelEasterEgg } from '../../src/scripts/label-easter-egg';
import * as labelCollection from '../../src/lib/label-collection';

vi.mock('../../src/lib/features', () => ({ IS_MY_DAY_ENABLED: true }));

function buildDom(): void {
  document.body.innerHTML = `
    <main>
      <article data-my-day-session="a"><button type="button" data-my-day-toggle aria-pressed="false">Ajouter à ma journée</button></article>
      <div class="site-label-shell" data-label-shell data-label-origin data-label-id="session-a" data-label-rotation="-1">
        <div class="site-label" data-label-card>
          <div data-label-front></div>
          <div data-label-back></div>
          <div data-label-fold-shadow></div>
          <audio data-label-sound></audio>
          <button type="button" data-label-corner aria-label="Décoller l’étiquette · Entrée ou Espace l’ajoute à la collection"></button>
        </div>
      </div>
      <aside data-label-archive data-required-labels='["session-a"]'>
        <button data-label-archive-tab aria-expanded="false"><b data-label-archive-count></b></button>
        <div data-label-dropzone></div>
        <span data-label-archive-progress></span>
        <a data-label-archive-reward hidden></a>
        <p data-label-archive-empty></p>
        <ol>
          <li data-label-archive-item data-label-id="session-a" data-session-id="a" data-session-start="11:15" data-session-track="tech" data-session-title="Session A" hidden>
            <a class="site-label" href="/x">carte</a>
            <template data-label-restick-template>
              <div class="site-label-shell site-label-shell--cover" data-label-shell data-label-origin data-label-id="session-a" data-label-rotation="-1">
                <article class="site-label site-label--cover site-label--peelable" data-label-card>
                  <div data-label-front>sticker de couverture</div>
                  <audio data-label-sound></audio>
                  <div data-label-back></div>
                  <div data-label-fold-shadow></div>
                  <button type="button" data-label-corner></button>
                </article>
              </div>
            </template>
            <button type="button" data-label-archive-restick data-label-restick-name="Session A" disabled aria-disabled="true"></button>
          </li>
        </ol>
        <button data-label-archive-close></button>
        <button data-label-archive-reset></button>
      </aside>
      <div data-label-archive-live></div>
    </main>`;
}

/* Le classeur n'est pilotable qu'au travers du DOM complet : ce banc monte une
 * origine, une fiche de classeur et sa poignée, seul moyen de couvrir la reprise
 * d'une étiquette classée sans se limiter aux fonctions pures. */
describe('restick from the archive', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    buildDom();
  });

  it('re-arms a collected label and puts it back in its original slot', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const shell = document.querySelector<HTMLElement>('[data-label-origin]')!;
    const handle = document.querySelector<HTMLButtonElement>('[data-label-archive-restick]')!;
    const live = document.querySelector<HTMLElement>('[data-label-archive-live]')!;

    expect(shell.classList.contains('is-collected')).toBe(true);
    expect(shell.classList.contains('is-storage-settled')).toBe(true);
    expect(handle.disabled).toBe(false);
    expect(handle.getAttribute('aria-label')).toContain('Recoller l’étiquette');

    handle.click();

    expect(labelCollection.isCollected('session-a')).toBe(false);
    expect(labelCollection.getPlacement('session-a')).toBeUndefined();
    expect(shell.classList.contains('is-collected')).toBe(false);
    expect(document.querySelector('[data-label-card]')!.parentElement).toBe(shell);
    expect(document.querySelector<HTMLElement>('[data-label-archive-item]')!.hidden).toBe(true);
    expect(live.textContent).toContain('recollée');
    expect(document.activeElement).toBe(document.querySelector('[data-label-corner]'));
  });

  it('carries the label into a pointer drag and stores where it lands', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const handle = document.querySelector<HTMLButtonElement>('[data-label-archive-restick]')!;
    const card = document.querySelector<HTMLElement>('[data-label-card]')!;

    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 3, clientX: 300, clientY: 400, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: 200, clientY: 300, bubbles: true }));

    expect(labelCollection.isCollected('session-a')).toBe(false);
    expect(labelCollection.getPlacement('session-a')).toBeDefined();
    expect(card.classList.contains('is-lifted')).toBe(true);
    expect(card.parentElement).toBe(document.body);

    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: 180, clientY: 260, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientX: 180, clientY: 260, bubbles: true }));

    expect(card.classList.contains('is-placed')).toBe(true);
    expect(labelCollection.getPlacement('session-a')).toBeDefined();
    expect(labelCollection.isCollected('session-a')).toBe(false);
  });

  it('carries the label when the drag starts on the archive card itself', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const card = document.querySelector<HTMLElement>('[data-label-archive-item] a')!;
    const node = document.querySelector<HTMLElement>('[data-label-card]')!;

    card.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 5, clientX: 300, clientY: 400, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 5, clientX: 200, clientY: 300, bubbles: true }));

    expect(labelCollection.isCollected('session-a')).toBe(false);
    expect(node.classList.contains('is-lifted')).toBe(true);
  });

  /* Chrome démarre son propre glisser-déposer sur un lien dès le premier
   * mouvement, envoie un pointercancel et ne délivre plus aucun pointermove :
   * sans ce refus, le geste attendu ne peut jamais aboutir dans un vrai
   * navigateur. */
  it('refuses the browser native link drag on an archive card', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const item = document.querySelector<HTMLElement>('[data-label-archive-item]')!;
    const dragStart = new Event('dragstart', { bubbles: true, cancelable: true });
    item.querySelector('a')!.dispatchEvent(dragStart);

    expect(dragStart.defaultPrevented).toBe(true);
  });

  it('never navigates on the click that closes a drag', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const card = document.querySelector<HTMLElement>('[data-label-archive-item] a')!;
    card.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 7, clientX: 300, clientY: 400, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 210, clientY: 320, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: 210, clientY: 320, bubbles: true }));

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(labelCollection.isCollected('session-a')).toBe(false);
  });

  it('refuses the text selection the browser starts under a drag', () => {
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const card = document.querySelector<HTMLElement>('[data-label-archive-item] a')!;
    card.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 9, clientX: 300, clientY: 400, bubbles: true }));

    const duringGesture = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(duringGesture);
    expect(duringGesture.defaultPrevented).toBe(true);

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, clientX: 200, clientY: 300, bubbles: true }));

    const afterGesture = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(afterGesture);
    expect(afterGesture.defaultPrevented).toBe(false);
  });

  it('places a collected label freely when the page holds no origin for it', () => {
    document.querySelector('[data-label-origin]')!.remove();
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const handle = document.querySelector<HTMLButtonElement>('[data-label-archive-restick]')!;
    expect(handle.disabled).toBe(false);
    expect(handle.getAttribute('aria-label')).toContain('Recoller l’étiquette');

    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 11, clientX: 300, clientY: 400, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, clientX: 220, clientY: 320, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, clientX: 180, clientY: 260, bubbles: true }));

    const placed = document.querySelector<HTMLElement>('main > [data-label-card]')!;
    expect(placed).not.toBeNull();
    expect(placed.classList.contains('site-label--cover')).toBe(true);
    expect(placed.classList.contains('site-label--peelable')).toBe(true);
    expect(placed.classList.contains('is-placed')).toBe(true);
    expect(placed.parentElement).toBe(document.querySelector('main'));
    expect(labelCollection.isCollected('session-a')).toBe(false);
    expect(labelCollection.getPlacement('session-a')).toBeDefined();
  });

  it('requires peeling the corner before moving a freely placed label again', () => {
    document.querySelector('[data-label-origin]')!.remove();
    labelCollection.collect('session-a');
    initLabelEasterEgg();

    const handle = document.querySelector<HTMLButtonElement>('[data-label-archive-restick]')!;
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 21, clientX: 300, clientY: 400, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 21, clientX: 220, clientY: 320, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, clientX: 180, clientY: 260, bubbles: true }));

    const placed = document.querySelector<HTMLElement>('main > [data-label-card]')!;
    const corner = placed.querySelector<HTMLButtonElement>('[data-label-corner]')!;
    const firstPlacement = labelCollection.getPlacement('session-a');

    placed.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 22, clientX: 180, clientY: 260, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 22, clientX: 420, clientY: 360, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 22, clientX: 420, clientY: 360, bubbles: true }));
    expect(labelCollection.getPlacement('session-a')).toEqual(firstPlacement);

    corner.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 23, clientX: 450, clientY: 180, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 23, clientX: 80, clientY: 560, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 23, clientX: 420, clientY: 360, bubbles: true }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 23, clientX: 420, clientY: 360, bubbles: true }));

    expect(placed.classList.contains('is-placed')).toBe(true);
    expect(labelCollection.getPlacement('session-a')).not.toEqual(firstPlacement);
    expect(labelCollection.isCollected('session-a')).toBe(false);
  });

  it('reveals the collection immediately when a programme choice is added', () => {
    vi.useFakeTimers();
    document.querySelector('[data-label-origin]')!.remove();
    initLabelEasterEgg();

    document.querySelector<HTMLButtonElement>('[data-my-day-toggle]')!.click();
    vi.advanceTimersByTime(900);

    const archive = document.querySelector<HTMLElement>('[data-label-archive]')!;
    expect(labelCollection.isCollected('session-a')).toBe(true);
    expect(archive.classList.contains('is-available')).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-label-archive-item]')!.hidden).toBe(false);
    expect(document.querySelector('[data-label-archive-count]')?.textContent).toBe('01');
    vi.useRealTimers();
  });

  it('restores the original sticker when the session is removed from the day', () => {
    labelCollection.collect('session-a');
    window.localStorage.setItem('genaidays:my-day:v1', JSON.stringify({ choices: { '11:15': 'a' } }));
    initLabelEasterEgg();

    const shell = document.querySelector<HTMLElement>('[data-label-origin]')!;
    expect(shell.classList.contains('is-collected')).toBe(true);

    document.querySelector<HTMLButtonElement>('[data-my-day-toggle]')!.click();

    expect(labelCollection.isCollected('session-a')).toBe(false);
    expect(shell.classList.contains('is-collected')).toBe(false);
    expect(document.querySelector<HTMLElement>('[data-label-card]')!.parentElement).toBe(shell);
  });

});
