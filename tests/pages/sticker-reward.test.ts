import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import CongratulationsPage from '../../src/pages/stickers/felicitations.astro';
import RewardPage from '../../src/pages/stickers/recompense.astro';
import { POST } from '../../src/pages/api/sticker-reward';

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
    expect(html).toContain('data-share-url="https://genai-days-nantes.com"');
    /* Un script inline n'est pas compilé : un import y est une erreur de
     * syntaxe qui laissait la page masquée pour toujours. */
    expect(html).not.toMatch(/<script>[^<]*\bimport\s*\{/);
  });

  it('renders the English registration form with localized copy and links', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(RewardPage, {
      request: new Request('https://example.com/en/stickers/reward'),
    });

    expect(html).toContain('<title>Your reward · GenAI Days</title>');
    expect(html).toContain('name="phone"');
    expect(html).toContain('Save my details');
    expect(html).toContain('February 17, 2027');
    expect(html).toContain('href="/en/privacy#donnees-personnelles"');
    expect(html).not.toContain('Sauvegarder mes informations');
  });

  it('renders the English final screen and shares the English post', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CongratulationsPage, {
      request: new Request('https://example.com/en/stickers/congratulations'),
    });

    expect(html).toContain('<title>Congratulations · GenAI Days</title>');
    expect(html).toContain('Share on LinkedIn');
    expect(html).toContain('I’m keeping the secret, but the challenge is on.');
    expect(html).toContain('data-share-url="https://genai-days-nantes.com/en"');
    expect(html).not.toContain('Partager sur LinkedIn');
  });
});

function submitReward(body: Record<string, unknown>): Promise<Response> {
  return Promise.resolve(
    POST({
      request: new Request('https://genai-days-nantes.com/api/sticker-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://genai-days-nantes.com' },
        body: JSON.stringify(body),
      }),
    } as never),
  );
}

describe('sticker reward endpoint', () => {
  it('answers in the language sent by the form', async () => {
    const response = await submitReward({ locale: 'en', firstName: 'Ada' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'All fields are required.' });
  });

  it('falls back to French when the locale is missing or unknown', async () => {
    const missing = await submitReward({ firstName: 'Ada' });
    const unknown = await submitReward({ locale: 'de', firstName: 'Ada' });

    expect(await missing.json()).toEqual({ message: 'Tous les champs sont obligatoires.' });
    expect(await unknown.json()).toEqual({ message: 'Tous les champs sont obligatoires.' });
  });

  /* Le formulaire repère le champ fautif aux mots « email » et « phone » du
   * message : les deux langues doivent les contenir. */
  it('names the rejected field in English messages', async () => {
    const identity = { locale: 'en', firstName: 'Ada', lastName: 'Lovelace' };
    const badEmail = await submitReward({ ...identity, email: 'ada', phone: '06 12 34 56 78' });
    const badPhone = await submitReward({ ...identity, email: 'ada@example.com', phone: 'call me' });

    expect((await badEmail.json()).message).toMatch(/email/i);
    expect((await badPhone.json()).message).toMatch(/phone/i);
  });
});
