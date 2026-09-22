import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import SpeakerPage from '../../src/pages/speakers/[speaker].astro';
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
    expect(html).toContain('FinOps : process pour contrôler les coûts des agents et des dev tools');
    expect(html).toContain('Comment mettre en place une démarche FinOps');
    expect(html).toContain('href="/programme/finops-agents-dev-tools"');
    expect(html).toContain('Agents IA');
    expect(html).toContain('data-track-mark="decideurs"');
    expect(html).toContain('Ceux qui décident');
  });
});
