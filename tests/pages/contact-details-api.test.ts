import { describe, expect, it } from 'vitest';
import EVENT from '../../src/content/event.json';
import { POST } from '../../src/pages/api/contact-details';

const SITE_URL = EVENT.url;

function request(url: string, init: RequestInit) {
  return new Request(url, init);
}

describe('contact details endpoint', () => {
  it('rejects cross-origin requests without exposing contact data', async () => {
    const response = await POST({
      request: request(SITE_URL + '/api/contact-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.org',
        },
        body: JSON.stringify({ topic: 'press' }),
      }),
    } as never);

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(await response.text()).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });

  it('rejects unknown topics before reading a private value', async () => {
    const response = await POST({
      request: request(SITE_URL + '/api/contact-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: SITE_URL,
        },
        body: JSON.stringify({ topic: 'unknown' }),
      }),
    } as never);

    expect(response.status).toBe(404);
  });
});
