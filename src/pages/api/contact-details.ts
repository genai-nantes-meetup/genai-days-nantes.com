import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { CONTACT_PROFILES, isContactTopic } from '../../lib/contact';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../lib/i18n';

export const prerender = false;

const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

/* La langue arrive dans le corps de la requête. Les refus prononcés avant
 * sa lecture (origine, taille, format, JSON illisible) restent en français. */
const ERROR_MESSAGES = {
  fr: {
    unknownTopic: 'Ce contact est introuvable.',
    unavailable: 'Les coordonnées sont momentanément indisponibles. Réessayez dans quelques instants.',
  },
  en: {
    unknownTopic: 'This contact could not be found.',
    unavailable: 'The contact details are temporarily unavailable. Please try again in a few moments.',
  },
} satisfies Record<Locale, Record<string, string>>;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return json({ message: 'Cette demande ne peut pas être traitée.' }, 403);
      }
    } catch {
      return json({ message: 'Cette demande ne peut pas être traitée.' }, 403);
    }
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2_000) {
    return json({ message: 'La demande est trop volumineuse.' }, 413);
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ message: 'Le format de la demande est invalide.' }, 415);
  }

  // Un corps JSON valide peut valoir null : les champs se lisent donc avec ?.
  let payload: { topic?: unknown; locale?: unknown } | null;
  try {
    payload = await request.json();
  } catch {
    return json({ message: 'La demande est invalide.' }, 400);
  }

  const requestedLocale = payload?.locale;
  const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const topic = payload?.topic;

  if (!isContactTopic(topic)) {
    return json({ message: ERROR_MESSAGES[locale].unknownTopic }, 404);
  }

  const profile = CONTACT_PROFILES[topic];
  const contactValue = getSecret(profile.environmentKey)?.trim();

  if (!contactValue) {
    console.error(`Contact configuration is missing for ${profile.environmentKey}.`);
    return json({ message: ERROR_MESSAGES[locale].unavailable }, 503);
  }

  const profileCopy = profile[locale];
  return json({
    contact: {
      label: profileCopy.contactLabel,
      value: contactValue,
    },
    person: {
      image: profile.image,
      name: profileCopy.name,
      role: profileCopy.role,
    },
    subject: profileCopy.subject,
    suggestion: profileCopy.message,
  });
};
