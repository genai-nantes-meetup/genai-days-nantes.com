// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { capture } from '../../src/lib/analytics';

describe('capture', () => {
  afterEach(() => {
    delete window.posthog;
  });

  it('is a no-op when PostHog has not loaded', () => {
    expect(() => capture('ticket_cta_clicked')).not.toThrow();
  });

  it('forwards the event name and properties to window.posthog', () => {
    const captureSpy = vi.fn();
    window.posthog = { capture: captureSpy };

    capture('contact_modal_opened', { topic: 'privacy' });

    expect(captureSpy).toHaveBeenCalledWith('contact_modal_opened', { topic: 'privacy' });
  });

  it('swallows errors thrown by window.posthog.capture', () => {
    window.posthog = {
      capture: () => {
        throw new Error('blocked by an ad-blocker');
      },
    };

    expect(() => capture('ticket_cta_clicked')).not.toThrow();
  });
});
