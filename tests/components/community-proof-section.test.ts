import { describe, expect, it } from 'vitest';
import CommunityProofSection from '../../src/components/CommunityProofSection.astro';
import LandingStory from '../../src/components/LandingStory.astro';
import { createAstroContainer } from '../utils/create-astro-container';

describe('CommunityProofSection.astro', () => {
  it('renders one compact stage with three progressively disclosed communities', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(CommunityProofSection);

    expect(html).toContain('La communauté est déjà là.</h2>');
    expect(html).toContain('arrive à Nantes, porté par une équipe qui y rassemble déjà celles et ceux qui font l’IA générative.');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain('role="tabpanel"');
    expect(html.match(/aria-pressed="(true|false)"/g)).toHaveLength(3);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('community-panel-nantes');
    expect(html).toContain('community-panel-france');
    expect(html).toContain('Le hackathon Gen AI');
    expect(html).toContain('Le meetup mensuel');
    expect(html).toContain('Le réseau national');
    expect(html).not.toContain('Pour sa première édition à Nantes');
    expect(html).toContain('aria-controls="community-panel-shift"');
    expect(html).not.toContain('community-map__orbit');
  });

  it('keeps the three community profiles without the former evidence carousel', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(CommunityProofSection);

    expect(html).toContain('4,8/5');
    expect(html).toContain('7 000+');
    expect(html.match(/src="\/logos\/logo-shift-noir.svg"/g)).toHaveLength(1);
    expect(html).not.toContain('data-community-evidence');
    expect(html).not.toContain('data-community-carousel');
    expect(html).not.toContain('Mathieu Sacchi');
  });

  it('appears after the programme in the landing narrative', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(LandingStory, { props: { speakers: [], programmeMoments: [] } });
    const speakersStart = html.indexOf('id="speakers"');
    const programmeStart = html.indexOf('id="programme"');
    const speakersSection = html.slice(speakersStart, programmeStart);

    expect(programmeStart).toBeLessThan(html.indexOf('data-community-proof'));
    expect(speakersSection).not.toContain('data-track-mark');
  });
});
