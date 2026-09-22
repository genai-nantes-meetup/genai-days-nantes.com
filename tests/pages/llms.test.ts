import { getCollection } from 'astro:content';
import { describe, expect, it } from 'vitest';
import { GET } from '../../src/pages/llms.txt';
import { stripMarkdownToPlainText } from '../../src/lib/markdown';

describe('llms.txt', () => {
  it('derives every announced session from the content collection', async () => {
    const sessions = await getCollection('sessions');
    const response = await GET({
      site: new URL('https://example.com/'),
      url: new URL('https://example.com/llms.txt'),
    } as never);
    const text = await response.text();

    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(text).toContain('## Sessions annoncées');

    for (const session of sessions) {
      expect(text).toContain(session.data.title);
      expect(text).toContain(`https://example.com/programme/${session.id}`);
      if (session.body?.trim()) expect(text).toContain(stripMarkdownToPlainText(session.body));
    }
  });

  it('lists the event social profiles', async () => {
    const response = await GET({
      site: new URL('https://example.com/'),
      url: new URL('https://example.com/llms.txt'),
    } as never);
    const text = await response.text();

    expect(text).toContain('- LinkedIn : https://www.linkedin.com/company/generative-ai-nantes/');
    expect(text).toContain('- X : https://x.com/GenAINantes');
  });
});
