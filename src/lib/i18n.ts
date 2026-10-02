/* Socle de la version anglaise. Aucune dépendance Astro : les scripts client
 * l'importent aussi. L'i18n routing d'Astro n'est pas utilisé parce qu'il ne
 * sait pas traduire les segments d'URL (/partenaires devient /en/partners). */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export const INTL_LOCALES: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' };
export const OG_LOCALES: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US' };
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English' };

const ENGLISH_PREFIX = '/en';

/* Chaque page française et son équivalent anglais. Les sous-chemins suivent
 * leur préfixe : /programme/agentic-coding devient /en/program/agentic-coding.
 * Une page ajoutée au site doit être déclarée ici en même temps que son
 * wrapper dans src/pages/en/. */
const ROUTES: ReadonlyArray<{ fr: string; en: string }> = [
  { fr: '/programme', en: '/en/program' },
  { fr: '/speakers', en: '/en/speakers' },
  { fr: '/partenaires', en: '/en/partners' },
  { fr: '/equipe', en: '/en/team' },
  { fr: '/infos-pratiques', en: '/en/practical-info' },
  { fr: '/contact', en: '/en/contact' },
  { fr: '/press-kit', en: '/en/press-kit' },
  { fr: '/confidentialite', en: '/en/privacy' },
  { fr: '/code-of-conduct', en: '/en/code-of-conduct' },
  { fr: '/stickers/felicitations', en: '/en/stickers/congratulations' },
  { fr: '/stickers/recompense', en: '/en/stickers/reward' },
];

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function getLocaleFromPath(pathname: string): Locale {
  return matchesPrefix(normalizePathname(pathname), ENGLISH_PREFIX) ? 'en' : 'fr';
}

function translatePathname(pathname: string, from: Locale, to: Locale): string | undefined {
  if (from === to) return pathname;
  if (pathname === (from === 'fr' ? '/' : ENGLISH_PREFIX)) return to === 'fr' ? '/' : ENGLISH_PREFIX;

  for (const route of ROUTES) {
    if (matchesPrefix(pathname, route[from])) return `${route[to]}${pathname.slice(route[from].length)}`;
  }

  return undefined;
}

/* Traduit un lien interne écrit avec son chemin français. Les assets
 * (/images, /press, /llms.txt, /api...), les ancres seules et les URLs
 * externes ne correspondent à aucune route et ressortent intacts. */
export function localizePath(href: string, locale: Locale): string {
  if (locale === 'fr' || !href.startsWith('/') || href.startsWith('//')) return href;

  const suffixIndex = href.search(/[?#]/);
  const pathname = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : href.slice(suffixIndex);
  const normalized = normalizePathname(pathname);
  if (getLocaleFromPath(normalized) === 'en') return href;

  const translated = translatePathname(normalized, 'fr', 'en');
  return translated === undefined ? href : `${translated}${suffix}`;
}

/* Les deux versions d'une page, pour les hreflang, le sitemap et le
 * sélecteur de langue. undefined quand la page n'existe que dans une langue. */
export function getAlternatePaths(pathname: string): Record<Locale, string> | undefined {
  const normalized = normalizePathname(pathname);
  const locale = getLocaleFromPath(normalized);
  const fr = translatePathname(normalized, locale, 'fr');
  const en = translatePathname(normalized, locale, 'en');
  return fr === undefined || en === undefined ? undefined : { fr, en };
}

/* Côté client, la langue de la page est celle que le layout a posée sur
 * <html lang>, rendue côté serveur depuis l'URL. */
export function getDocumentLocale(): Locale {
  const lang = typeof document === 'undefined' ? '' : document.documentElement.lang.slice(0, 2);
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}
