// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAnalytics } from '../../src/scripts/analytics';
import { CTA_LINKS } from '../../src/lib/cta-links';

describe('initAnalytics', () => {
  let captureSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    captureSpy = vi.fn();
    window.posthog = { capture: captureSpy };
    document.body.innerHTML = `
      <a href="${CTA_LINKS.tickets}">Réserver ma place</a>
      <a href="/contact">Contact</a>
    `;
    initAnalytics();
  });

  afterEach(() => {
    delete window.posthog;
  });

  it('captures a ticket_cta_clicked event when a ticket link is clicked', () => {
    document.querySelector<HTMLAnchorElement>(`a[href="${CTA_LINKS.tickets}"]`)!.click();

    expect(captureSpy).toHaveBeenCalledWith('ticket_cta_clicked', undefined);
  });

  it('ignores clicks on unrelated links', () => {
    document.querySelector<HTMLAnchorElement>('a[href="/contact"]')!.click();

    expect(captureSpy).not.toHaveBeenCalled();
  });
});
