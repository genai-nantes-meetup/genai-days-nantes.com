import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CoverLabel from '../../src/components/CoverLabel.astro';

describe('CoverLabel.astro', () => {
  it('renders the physical paper layers and a large accessible peel handle', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CoverLabel, {
      props: {
        labelId: 'session-piloter-transformation-dsi',
        format: 'Talk',
        room: 'Salle A',
        startTime: '09:45',
        durationMinutes: 45,
        title: "Piloter la transformation IA à l'échelle d'une DSI",
        speakers: [
          {
            name: 'Ada Lovelace',
            company: 'Analytical Engines',
            companyLogo: '/logos/analytical-engines.jpg',
          },
          {
            name: 'Grace Hopper',
            company: 'Compiler Labs',
            companyLogo: '/logos/compiler-labs.svg',
          },
        ],
      },
    });

    expect(html).toContain('data-label-id="session-piloter-transformation-dsi"');
    expect(html).toContain('site-label-shell--bottom-left');
    expect(html).toContain('data-label-front');
    expect(html).toContain('data-label-back');
    expect(html).toContain('data-label-fold-shadow');
    expect(html).not.toContain('data-label-bond');
    expect(html).toContain('aria-label="Décoller l’étiquette · Entrée ou Espace l’ajoute à la collection"');
    expect(html).toContain("Piloter la transformation IA à l&#39;échelle d&#39;une DSI");
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Grace Hopper');
    expect(html).toContain('src="/logos/analytical-engines.jpg"');
    expect(html).toContain('src="/logos/compiler-labs.svg"');
    expect(html).toContain('alt="Logo Analytical Engines"');
    expect(html).toContain('alt="Logo Compiler Labs"');
    expect(html).not.toContain('>Talk<');
    expect(html).not.toContain('GAD–26');
  });

  it('reduces long session titles on desktop and mobile', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CoverLabel, {
      props: {
        labelId: 'session-finops-agents-dev-tools',
        format: 'Talk',
        room: 'Pour ceux qui décident',
        startTime: '15:55',
        durationMinutes: 40,
        title: 'FinOps\u00a0: process pour contrôler les coûts des agents et des dev tools',
      },
    });

    expect(html).toContain('--cover-title-size: clamp(1.05rem, 1.45vw, 1.35rem)');
    expect(html).toContain('--cover-title-mobile-size: clamp(1.15rem, 4.8vw, 1.35rem)');
    expect(html).toContain('--label-mark-size: clamp(2rem, 1.4vw, 1.1rem)');
    expect(html).toContain('--label-padding-x: clamp(0.65rem, 1.1vw, 0.78rem)');
  });
});
