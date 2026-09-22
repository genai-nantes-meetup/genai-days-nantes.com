import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import SpeakersIndexPage from '../../src/pages/speakers/index.astro';
import { SPEAKER_TARGET } from '../../src/lib/speakers';
import { createAstroContainer } from '../utils/create-astro-container';

describe('speakers index page', () => {
  it('renders every announced speaker in a linked portrait wall', async () => {
    const speakers = await getCollection('speakers');
    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakersIndexPage);

    expect(html).toContain('data-speaker-wall');
    expect(html.match(/data-speaker-tile=/g)).toHaveLength(speakers.length);

    speakers.forEach((speaker) => {
      expect(html).toContain(`data-speaker-tile="${speaker.id}"`);
      expect(html).toContain(`href="/speakers/${speaker.id}"`);
      expect(html).not.toContain(`href="/speakers/${speaker.id}/"`);
      expect(html).toContain(`alt="Portrait de ${speaker.data.name}"`);
    });

    expect(html).not.toContain('Parcours ·');
    expect(html.match(/data-track-mark-variant="icon"/g)).toHaveLength(speakers.length);
    expect(html.match(/data-track-mark-variant="label"/g)).toHaveLength(2);
    expect(html).toContain('lucide-telescope');
    expect(html).toContain('lucide-wrench');
    expect(html).not.toContain('data-state="closed"');
    expect(html).not.toContain('track-tooltip');
    expect(html).toContain('speaker-tile__role');
    expect(html).toContain('speaker-tile__company');

    const christelleIndex = html.indexOf('data-speaker-tile="christelle-morancais"');
    const nicolasIndex = html.indexOf('data-speaker-tile="nicolas-martignole"');
    const jeanBaptisteIndex = html.indexOf('data-speaker-tile="jean-baptiste-kempf"');
    const quentinIndex = html.indexOf('data-speaker-tile="quentin-adam"');
    const theoIndex = html.indexOf('data-speaker-tile="theo-hubert"');

    expect(christelleIndex).toBeLessThan(nicolasIndex);
    expect(nicolasIndex).toBeLessThan(jeanBaptisteIndex);
    expect(jeanBaptisteIndex).toBeLessThan(quentinIndex);
    expect(quentinIndex).toBeLessThan(theoIndex);
  });

  it('shows the next announcement placeholder and closes with the shared ticket', async () => {
    const speakers = await getCollection('speakers');
    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakersIndexPage);

    expect(html).toContain('Prochain intervenant');
    expect(html).toContain('Annonce à venir');
    expect(html.match(/data-speaker-placeholder/g)).toHaveLength(SPEAKER_TARGET - speakers.length);
    expect(html).not.toContain('Prochaines annonces');
    expect(html).not.toContain('+17');
    expect(html).not.toContain('speaker-tile__number');
    expect(html).toContain('/images/speaker_background-optimized.webp');
    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('Réserver ma place');
    expect(html).toContain('"@type":"CollectionPage"');
  });
});
