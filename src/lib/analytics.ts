export const POSTHOG_API_HOST = 'https://hogpost.naomakers.com';
export const POSTHOG_UI_HOST = 'https://us.posthog.com';

interface PostHogClient {
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogClient;
  }
}

/* PostHog n'est chargé qu'en production (voir BaseLayout.astro) : en dev, sous
 * un bloqueur de publicité, ou avant que le snippet asynchrone n'ait fini de
 * charger, window.posthog est absent. Cette fonction reste alors un no-op
 * silencieux plutôt que de faire échouer le code appelant. */
export function capture(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    window.posthog?.capture(event, properties);
  } catch {
    // PostHog indisponible ou en erreur : rien à mesurer, rien à casser.
  }
}
