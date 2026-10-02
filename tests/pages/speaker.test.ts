import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import SpeakerPage from '../../src/pages/speakers/[speaker].astro';
import { EVENT_YEAR } from '../../src/lib/event';
import { createAstroContainer } from '../utils/create-astro-container';

describe('speaker page', () => {
  it('renders the detailed career, GenAI legitimacy and every company card', async () => {
    const speakers = await getCollection('speakers');
    const speaker = speakers.find((entry) => entry.id === 'jean-baptiste-kempf');
    expect(speaker).toBeDefined();

    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakerPage, {
      props: { speaker, sessions: [] },
    });

    expect(html).toContain('Son parcours');
    expect(html).toContain('Sa légitimité numérique et GenAI');
    expect(html).toContain('Les entreprises qui jalonnent son parcours');
    expect(html).toContain('VideoLAN et VLC');
    expect(html).toContain('Scaleway');
    expect(html).toContain('Kyber');
    // Le parcours (decideurs/tech) se déduit désormais des sessions du speaker :
    // sans session annoncée, aucun badge de parcours n'est affichable.
    expect(html).not.toContain('data-track-mark');
    expect(html).not.toContain('id="speaker-sessions-title"');
  });

  it('connects a speaker profile to every announced session', async () => {
    const speakers = await getCollection('speakers');
    const sessions = await getCollection('sessions');
    const speaker = speakers.find((entry) => entry.id === 'nicolas-martignole');
    expect(speaker).toBeDefined();

    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakerPage, {
      props: { speaker, sessions: sessions.filter((session) => session.data.speakerSlugs.includes(speaker?.id ?? '')) },
    });

    expect(html).toContain('Sa session');
    expect(html).toContain('Comment finir l&#39;année?');
    expect(html).toContain('Back Market est passé de 0 à 340 utilisateurs');
    expect(html).toContain('href="/programme/finops-agents"');
    expect(html).toContain('Agents IA');
    expect(html).toContain('data-track-mark="decideurs"');
    expect(html).toContain('Ceux qui décident');
  });

  it('renders the English profile with localized labels, links and metadata', async () => {
    const speakers = await getCollection('speakers');
    const sessions = await getCollection('sessions');
    const speaker = speakers.find((entry) => entry.id === 'jean-baptiste-kempf');
    expect(speaker).toBeDefined();
    const speakerSessions = sessions.filter((session) => session.data.speakerSlugs.includes(speaker?.id ?? ''));

    const container = await createAstroContainer();
    const html = await container.renderToString(SpeakerPage, {
      props: { speaker, sessions: speakerSessions },
      request: new Request('https://example.com/en/speakers/jean-baptiste-kempf'),
    });

    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`<title>Jean-Baptiste Kempf · Speaker · GENAI DAYS ${EVENT_YEAR}</title>`);
    expect(html).toContain('Digital and GenAI credentials');
    expect(html).toContain('Organizations along the way');
    expect(html).not.toContain('Son parcours');
    expect(html).toMatch(/<a href="\/en\/speakers" class="speaker-back-link"[^>]*>.*?All speakers<\/a>/);
    speakerSessions.forEach((session) => {
      expect(html).toContain(`href="/en/program/${session.id}"`);
    });
    expect(html).toContain('"url":"https://example.com/en/speakers/jean-baptiste-kempf"');
  });
});
