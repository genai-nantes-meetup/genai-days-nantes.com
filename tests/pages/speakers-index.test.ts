import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import SpeakersIndexPage from '../../src/pages/speakers/index.astro';
import { EVENT_YEAR } from '../../src/lib/event';
import { SPEAKER_TARGET, sortSpeakersByProminence, trackForSpeaker } from '../../src/lib/speakers';
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
    const sessions = await getCollection('sessions');
    const withTrack = speakers.filter((speaker) => trackForSpeaker(speaker.id, sessions));
    expect(html.match(/data-track-mark-variant="icon"/g)).toHaveLength(withTrack.length);
    expect(html.match(/data-track-mark-variant="label"/g)).toHaveLength(2);
    expect(html).toContain('lucide-telescope');
    expect(html).toContain('lucide-wrench');
    expect(html).not.toContain('data-state="closed"');
    expect(html).not.toContain('track-tooltip');
    expect(html).toContain('speaker-tile__role');
    expect(html).toContain('speaker-tile__company');

    const positions = sortSpeakersByProminence(speakers).map((speaker) => html.indexOf(`data-speaker-tile="${speaker.id}"`));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('shows the company logo on the tile of speakers who have one', async () => {
    const speakers = await getCollection('speakers');
    const withLogo = speakers.filter((speaker) => speaker.data.companyLogo);
    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakersIndexPage);

    expect(withLogo.length).toBeGreaterThan(0);
    expect(html.match(/<span class="speaker-tile__company-logo/g)).toHaveLength(withLogo.length);
    withLogo.forEach((speaker) => {
      expect(html).toContain(`src="${speaker.data.companyLogoOnDark ?? speaker.data.companyLogo}"`);
    });
  });

  it('shows remaining announcement slots and closes with the shared ticket', async () => {
    const speakers = await getCollection('speakers');
    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakersIndexPage);

    const remainingSlots = Math.max(0, SPEAKER_TARGET - speakers.length);
    expect(html.includes('Prochain intervenant')).toBe(remainingSlots > 0);
    expect(html.includes('Annonce à venir')).toBe(remainingSlots > 0);
    expect(html.match(/data-speaker-placeholder/g) ?? []).toHaveLength(remainingSlots);
    expect(html).not.toContain('Prochaines annonces');
    expect(html).not.toContain('+17');
    expect(html).not.toContain('speaker-tile__number');
    expect(html).toContain('/images/speaker_background-optimized.webp');
    expect(html).toContain('id="pass-participant"');
    expect(html).toContain('Réserver ma place');
    expect(html).toContain('"@type":"CollectionPage"');
  });

  it('renders the English directory with localized profile links and metadata', async () => {
    const speakers = await getCollection('speakers');
    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakersIndexPage, {
      request: new Request('https://example.com/en/speakers'),
    });

    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`<title>Speakers ${EVENT_YEAR} · GENAI DAYS</title>`);
    expect(html).toContain('Voices chosen for their expertise.');
    expect(html.includes('Next speaker')).toBe(speakers.length < SPEAKER_TARGET);
    expect(html).not.toContain('Prochain intervenant');
    expect(html).toContain('Those who decide');
    expect(html).toContain('Those who implement');
    speakers.forEach((speaker) => {
      expect(html).toContain(`href="/en/speakers/${speaker.id}"`);
      expect(html).not.toContain(`href="/speakers/${speaker.id}"`);
    });
    expect(html).toContain('"url":"https://example.com/en/speakers"');
    expect(html).toContain('"inLanguage":"en"');
  });
});
