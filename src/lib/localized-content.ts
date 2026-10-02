import { getCollection, getEntry, render, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n';

/* Chaque collection traduisible et sa collection anglaise (src/content.config.ts). */
const TRANSLATION_COLLECTIONS = {
  tracks: 'tracksEn',
  speakers: 'speakersEn',
  sessions: 'sessionsEn',
  partners: 'partnersEn',
  team: 'teamEn',
} as const;

export type TranslatableCollection = keyof typeof TRANSLATION_COLLECTIONS;
type TranslationEntry<C extends TranslatableCollection> = CollectionEntry<(typeof TRANSLATION_COLLECTIONS)[C]>;

/* `& { collection: C }` : TypeScript n'infère pas C à travers le type
 * conditionnel de CollectionEntry<C>, il le lit sur le littéral `collection`. */
type Entry<C extends TranslatableCollection> = CollectionEntry<C> & { collection: C };

/* Une entrée dont les champs traduisibles sont dans la langue de la page.
 * `translation` garde le fichier anglais pour rendre son corps Markdown. */
export type LocalizedEntry<C extends TranslatableCollection> = Entry<C> & {
  translation?: TranslationEntry<C>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* Les objets fusionnent champ par champ (illustration.alt garde src et
 * variant), les tableaux d'objets par position (companies garde name,
 * website et logo), tout le reste est remplacé par la traduction. */
function mergeTranslation(base: unknown, translated: unknown): unknown {
  if (translated === undefined) return base;

  if (Array.isArray(base) && Array.isArray(translated) && translated.every(isPlainObject)) {
    return translated.map((item, index) => mergeTranslation(base[index], item));
  }

  if (isPlainObject(base) && isPlainObject(translated)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(translated)) merged[key] = mergeTranslation(base[key], value);
    return merged;
  }

  return translated;
}

/* Sans fichier anglais, l'entrée française est servie telle quelle : une
 * traduction manquante dégrade la page sans la casser. Le test de contenu
 * vérifie qu'aucune ne manque. */
/* Les conversions `as LocalizedEntry<C>` compensent la même limite : le
 * compilateur ne sait pas comparer deux instanciations génériques de
 * CollectionEntry, la forme est garantie par construction. */
export async function localizeEntry<C extends TranslatableCollection>(
  entry: Entry<C>,
  locale: Locale,
): Promise<LocalizedEntry<C>> {
  if (locale === 'fr') return entry as LocalizedEntry<C>;

  const translation = (await getEntry(TRANSLATION_COLLECTIONS[entry.collection], entry.id)) as
    | TranslationEntry<C>
    | undefined;
  if (!translation) return entry as LocalizedEntry<C>;

  return {
    ...entry,
    data: mergeTranslation(entry.data, translation.data) as CollectionEntry<C>['data'],
    body: translation.body?.trim() ? translation.body : entry.body,
    translation,
  } as LocalizedEntry<C>;
}

export async function getLocalizedCollection<C extends TranslatableCollection>(
  collection: C,
  locale: Locale,
): Promise<LocalizedEntry<C>[]> {
  const entries = (await getCollection(collection)) as Entry<C>[];
  return Promise.all(entries.map((entry) => localizeEntry<C>(entry, locale)));
}

/* À utiliser à la place de render(entry) : le corps vient du fichier
 * anglais quand il en a un. */
export function renderLocalizedBody<C extends TranslatableCollection>(entry: LocalizedEntry<C>) {
  return render(entry.translation?.body?.trim() ? entry.translation : entry);
}
