import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSecret } from 'astro:env/server';
import { Resend } from 'resend';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../lib/i18n';

export const prerender = false;

interface RewardSubmission {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  collected?: unknown;
  note?: unknown;
  locale?: unknown;
}

/* Réponses lues par le visiteur, dans la langue du formulaire. L'email
 * destiné aux organisateurs reste en français. */
const messages = {
  fr: {
    forbidden: 'Cette demande ne peut pas être traitée.',
    tooLarge: 'La demande est trop volumineuse.',
    invalidPayload: 'Les informations envoyées sont invalides.',
    missingFields: 'Tous les champs sont obligatoires.',
    invalidEmail: 'L’adresse email n’est pas valide.',
    invalidPhone: 'Le numéro de téléphone n’est pas valide.',
    incompleteCollection: 'La collection de stickers n’est pas complète.',
    unavailable: 'L’inscription est momentanément indisponible. Réessaie dans quelques instants.',
  },
  en: {
    forbidden: 'This request cannot be processed.',
    tooLarge: 'The request is too large.',
    invalidPayload: 'The information sent is invalid.',
    missingFields: 'All fields are required.',
    invalidEmail: 'The email address is not valid.',
    invalidPhone: 'The phone number is not valid.',
    incompleteCollection: 'The sticker collection is not complete.',
    unavailable: 'Registration is temporarily unavailable. Try again in a few moments.',
  },
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function readText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const POST: APIRoute = async ({ request }) => {
  /* La langue n'est connue qu'une fois le corps lu : les trois refus qui
   * précèdent restent en français, le formulaire du site ne peut pas les
   * provoquer. */
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ message: messages[DEFAULT_LOCALE].forbidden }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) {
    return json({ message: messages[DEFAULT_LOCALE].tooLarge }, 413);
  }

  let submission: RewardSubmission;
  try {
    submission = await request.json();
  } catch {
    return json({ message: messages[DEFAULT_LOCALE].invalidPayload }, 400);
  }

  const locale: Locale = isLocale(submission.locale) ? submission.locale : DEFAULT_LOCALE;
  const copy = messages[locale];

  /* Le piège à robots signale, il ne supprime plus. Une inscription jetée
   * ici partait avec un 200 : le client la considérait sauvegardée et le
   * participant, renvoyé vers les félicitations à chaque retour, ne pouvait
   * plus jamais la refaire. Le filtre qui compte est la collection complète
   * de stickers vérifiée plus bas ; le piège n'ajoute qu'un drapeau dans
   * l'email, invisible depuis la réponse HTTP pour ne pas se dénoncer. */
  const isSuspectedBot = readText(submission.note, 100) !== '';

  const firstName = readText(submission.firstName, 80);
  const lastName = readText(submission.lastName, 80);
  const email = readText(submission.email, 160).toLowerCase();
  const phone = readText(submission.phone, 32);
  const collected = Array.isArray(submission.collected)
    ? submission.collected.filter((value): value is string => typeof value === 'string')
    : [];

  if (!firstName || !lastName || !email || !phone) {
    return json({ message: copy.missingFields }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ message: copy.invalidEmail }, 400);
  }

  if (!/^[+\d][\d\s().-]{5,31}$/.test(phone)) {
    return json({ message: copy.invalidPhone }, 400);
  }

  const sessions = await getCollection('sessions');
  const speakers = await getCollection('speakers');
  const requiredLabelIds = [
    'landing-day-manifesto',
    ...speakers.map((speaker) => `speaker-${speaker.id}`),
    ...sessions.map((session) => `session-${session.id}`),
  ];
  const collectedSet = new Set(collected);

  if (!requiredLabelIds.every((labelId) => collectedSet.has(labelId))) {
    return json({ message: copy.incompleteCollection }, 403);
  }

  const apiKey = getSecret('RESEND_API_KEY');
  const fromEmail = getSecret('STICKER_COLLECTION_FROM_EMAIL');
  const rewardRecipient = getSecret('STICKER_COLLECTION_RECIPIENT');

  if (!apiKey || !fromEmail || !rewardRecipient) {
    if (import.meta.env.DEV) {
      console.info(
        'Sticker reward email simulated locally because its server configuration is incomplete.',
      );
      return json({ ok: true, simulated: true });
    }

    console.error('Sticker reward email configuration is missing.');
    return json({ message: copy.unavailable }, 503);
  }

  const resend = new Resend(apiKey);
  const submittedAt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date());
  const fullName = `${firstName} ${lastName}`;
  const safeFirstName = escapeHtml(firstName);
  const safeLastName = escapeHtml(lastName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);

  const suspicionNotice = 'Piège anti-robots déclenché : à vérifier avant la remise.';

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [rewardRecipient],
    replyTo: email,
    subject: isSuspectedBot
      ? `Easter egg complété · à vérifier · ${fullName}`
      : `Easter egg complété · ${fullName}`,
    text: [
      'Nouvelle inscription à la récompense de l’easter egg des stickers.',
      ...(isSuspectedBot ? [suspicionNotice] : []),
      '',
      `Prénom : ${firstName}`,
      `Nom : ${lastName}`,
      `Email : ${email}`,
      `Téléphone : ${phone}`,
      ...(locale === 'en' ? ['Langue du site : anglais'] : []),
      `Stickers collectés : ${requiredLabelIds.length}/${requiredLabelIds.length}`,
      `Inscription reçue le : ${submittedAt}`,
    ].join('\n'),
    html: `
      <h1>Nouvelle inscription à la récompense</h1>
      ${isSuspectedBot ? `<p><strong>${suspicionNotice}</strong></p>` : ''}
      <p><strong>Prénom&nbsp;:</strong> ${safeFirstName}</p>
      <p><strong>Nom&nbsp;:</strong> ${safeLastName}</p>
      <p><strong>Email&nbsp;:</strong> ${safeEmail}</p>
      <p><strong>Téléphone&nbsp;:</strong> ${safePhone}</p>
      ${locale === 'en' ? '<p><strong>Langue du site&nbsp;:</strong> anglais</p>' : ''}
      <p><strong>Stickers collectés&nbsp;:</strong> ${requiredLabelIds.length}/${requiredLabelIds.length}</p>
      <p><strong>Inscription reçue le&nbsp;:</strong> ${escapeHtml(submittedAt)}</p>
    `,
    tags: [{ name: 'source', value: 'sticker-reward' }],
  });

  if (error) {
    console.error('Sticker reward email could not be sent.', error);
    return json({ message: copy.unavailable }, 502);
  }

  return json({ ok: true });
};
