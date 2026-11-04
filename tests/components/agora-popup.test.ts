import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AgoraPopup from '../../src/components/AgoraPopup.astro';

describe('AgoraPopup.astro', () => {
  it('renders hidden, with the Agora link and a close button', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AgoraPopup);
    expect(html).toMatch(/<aside[^>]*data-agora-popup[^>]*hidden/);
    expect(html).toMatch(/href="https:\/\/agora\.genai-days-nantes\.com\/"[^>]*target="_blank"/);
    expect(html).toContain('data-agora-popup-close');
    expect(html).toContain('aria-label="Fermer"');
    expect(html).toContain('Votre journée sur l’app « Agora »');
  });

  it('switches to English under /en', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(AgoraPopup, { request: new Request('https://example.com/en') });
    expect(html).toContain('Your day on the “Agora” app');
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain('aria-label="Open Agora, opens a new tab"');
  });
});
