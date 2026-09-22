import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CongratulationsPage from '../../src/pages/stickers/felicitations.astro';
import RewardPage from '../../src/pages/stickers/recompense.astro';

describe('sticker reward pages', () => {
  it('renders the guarded winner registration form', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(RewardPage);

    expect(html).toContain('<title>Ta récompense · GenAI Days</title>');
    expect(html).toContain('data-reward-registration-page');
    expect(html).toContain('speaker-jean-baptiste-kempf');
    expect(html).toContain('speaker-nicolas-martignole');
    expect(html).toContain('speaker-quentin-adam');
    expect(html).toContain('name="lastName"');
    expect(html).toContain('name="firstName"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="phone"');
    expect(html).toContain('Sauvegarder mes informations');
    expect(html).toContain('href="/confidentialite#donnees-personnelles"');
    expect(html).toContain('17 février 2027');
  });

  it('renders the personalized final screen and both share actions', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CongratulationsPage);

    expect(html).toContain('<title>Félicitations · GenAI Days</title>');
    expect(html).toContain('data-reward-success-page');
    expect(html).toContain('data-reward-first-name');
    expect(html).toContain('Partager sur LinkedIn');
    expect(html).toContain('Partager sur X');
    expect(html).toContain('Je garde le secret, mais le défi est lancé.');
  });
});
