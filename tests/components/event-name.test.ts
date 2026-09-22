import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BrandText from '../../src/components/BrandText.astro';
import EventName from '../../src/components/EventName.astro';

describe('EventName.astro', () => {
  it('renders the event name in uppercase with the dedicated brand class', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(EventName);

    expect(html).toContain('class="event-name"');
    expect(html).toContain('GENAI DAYS');
    expect(html).toContain('event-name__gen');
    expect(html).toContain('event-name__ai');
    expect(html).toContain('event-name__days');
  });
});

it('adds the Nantes 2026 signature for logo placements', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(EventName, { props: { showLocation: true } });

  expect(html).toContain('event-name--with-location');
  expect(html).toContain('NANTES 2026');
});

describe('BrandText.astro', () => {
  it('applies the event name treatment inside a sentence', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BrandText, {
      props: { text: 'Bienvenue à GenAI Days à Nantes.' },
    });

    expect(html).toContain('Bienvenue à');
    expect(html).toContain('class="event-name"');
    expect(html).toContain('GENAI DAYS');
    expect(html).toContain('à Nantes.');
  });
});
