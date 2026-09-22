import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { CONTACT_PROFILES, isContactTopic } from '../../lib/contact';

export const prerender = false;

const RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

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

  let payload: { topic?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ message: 'La demande est invalide.' }, 400);
  }

  if (!isContactTopic(payload.topic)) {
    return json({ message: 'Ce contact est introuvable.' }, 404);
  }

  const profile = CONTACT_PROFILES[payload.topic];
  const contactValue = getSecret(profile.environmentKey)?.trim();

  if (!contactValue) {
    console.error(`Contact configuration is missing for ${profile.environmentKey}.`);
    return json(
      { message: 'Les coordonnées sont momentanément indisponibles. Réessayez dans quelques instants.' },
      503,
    );
  }

  return json({
    contact: {
      label: profile.contactLabel,
      value: contactValue,
    },
    person: {
      image: profile.image,
      name: profile.name,
      role: profile.role,
    },
    subject: profile.subject,
    suggestion: profile.message,
  });
};
