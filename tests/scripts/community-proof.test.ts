// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initCommunityProof } from '../../src/scripts/community-proof';

describe('initCommunityProof', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section data-community-proof>
        <button data-community-tab="shift" aria-pressed="true"></button>
        <button data-community-tab="nantes" aria-pressed="false"></button>
        <button data-community-tab="france" aria-pressed="false"></button>
        <article data-community-panel="shift"></article>
        <article data-community-panel="nantes" hidden></article>
        <article data-community-panel="france" hidden></article>
      </section>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reveals the selected community', () => {
    expect(initCommunityProof()).toBe(1);
    document.querySelector<HTMLButtonElement>('[data-community-tab="nantes"]')?.click();

    expect(document.querySelector<HTMLElement>('[data-community-panel="shift"]')?.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-community-panel="nantes"]')?.hidden).toBe(false);
  });

  it('moves the pressed state to the clicked community filter', () => {
    initCommunityProof();
    document.querySelector<HTMLButtonElement>('[data-community-tab="france"]')?.click();

    expect(document.querySelector('[data-community-tab="shift"]')?.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-community-tab="france"]')?.getAttribute('aria-pressed')).toBe('true');
  });
});
