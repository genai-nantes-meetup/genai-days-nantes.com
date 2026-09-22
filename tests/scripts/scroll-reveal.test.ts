// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { initScrollReveal } from '../../src/scripts/scroll-reveal';

describe('initScrollReveal', () => {
  it('animates every element marked data-reveal exactly once', () => {
    document.body.innerHTML = `
      <section data-reveal></section>
      <section data-reveal></section>
      <section></section>
    `;
    const fromTo = vi.fn();
    const registerPlugin = vi.fn();

    const count = initScrollReveal(document, { fromTo, registerPlugin });

    expect(count).toBe(2);
    expect(fromTo).toHaveBeenCalledTimes(2);
    expect(registerPlugin).toHaveBeenCalledTimes(1);
  });

  it('returns 0 and animates nothing when there are no data-reveal elements', () => {
    document.body.innerHTML = '<section></section>';
    const fromTo = vi.fn();
    const registerPlugin = vi.fn();

    const count = initScrollReveal(document, { fromTo, registerPlugin });

    expect(count).toBe(0);
    expect(fromTo).not.toHaveBeenCalled();
  });
});
