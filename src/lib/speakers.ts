import type { CollectionEntry } from 'astro:content';

export const SPEAKER_TARGET = 19;

export const SPEAKER_EVENT_ROLE_LABELS = {
  jury: 'Jury du Startup Contest',
  animateur: 'Animateur du Startup Contest',
} as const;

export const SPEAKER_EVENT_ROLE_SHORT_LABELS = {
  jury: 'Jury',
  animateur: 'Animateur',
} as const;

export const SPEAKER_PROMINENCE_ORDER = [
  'christelle-morancais',
  'jean-baptiste-kempf',
  'theo-hubert',
  'quentin-adam',
  'julien-lesaicherre',
  'nicolas-martignole',
] as const;

/* Dimensions réelles des fichiers portrait, non dérivables du schéma de la
 * collection speakers (pas de champ photoWidth/photoHeight en frontmatter).
 * Partagées entre toutes les vues qui affichent un portrait, pour réserver
 * l'espace d'image avant chargement et éviter un décalage de mise en page. */
export const SPEAKER_PORTRAIT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'christelle-morancais': { width: 800, height: 800 },
  'constance-nebbula': { width: 832, height: 832 },
  'david-leaurant': { width: 800, height: 800 },
  'florian-herveou': { width: 600, height: 600 },
  'gael-brisson': { width: 800, height: 800 },
  'julien-lesaicherre': { width: 800, height: 800 },
  'nicolas-martignole': { width: 1448, height: 1086 },
  'jean-baptiste-kempf': { width: 1200, height: 1801 },
  'quentin-adam': { width: 800, height: 800 },
  'sebastien-le-corfec': { width: 400, height: 400 },
  'thomas-mathieu': { width: 452, height: 452 },
  'theo-hubert': { width: 800, height: 800 },
};

/* Variante basse résolution disponible uniquement pour les portraits dont le
 * fichier `-optimized` dépasse largement toute taille d'affichage réelle
 * (mur de portraits, carrousel, fiche intervenant·e) : les autres portraits
 * sont déjà assez petits pour ne pas avoir besoin d'un second palier. */
const SPEAKER_PORTRAIT_SMALL_WIDTH = 480;

export const SPEAKER_PORTRAIT_SMALL: Partial<Record<string, string>> = {
  'christelle-morancais': '/speakers/christelle-morancais-480-optimized.webp',
  'constance-nebbula': '/speakers/constance-nebbula-480-optimized.webp',
  'david-leaurant': '/speakers/david-leaurant-480-optimized.webp',
  'gael-brisson': '/speakers/gael-brisson-480-optimized.webp',
  'julien-lesaicherre': '/speakers/julien-lesaicherre-480-optimized.webp',
  'nicolas-martignole': '/speakers/nicolas-martignole-wide-480-optimized.webp',
  'theo-hubert': '/speakers/theo-hubert-480-optimized.webp',
  'jean-baptiste-kempf': '/speakers/jean-baptiste-kempf-480-optimized.webp',
  'quentin-adam': '/speakers/quentin-adam-480-optimized.webp',
};

export function getSpeakerPortraitSrcset(speakerId: string, fullPhoto: string): string | undefined {
  const small = SPEAKER_PORTRAIT_SMALL[speakerId];
  const full = SPEAKER_PORTRAIT_DIMENSIONS[speakerId];
  if (!small || !full) return undefined;
  return `${small} ${SPEAKER_PORTRAIT_SMALL_WIDTH}w, ${fullPhoto} ${full.width}w`;
}

export function sortSpeakersByProminence<T extends { id: string; data: { name: string } }>(speakers: T[]) {
  return [...speakers].sort((left, right) => {
    const leftIndex = SPEAKER_PROMINENCE_ORDER.indexOf(left.id as (typeof SPEAKER_PROMINENCE_ORDER)[number]);
    const rightIndex = SPEAKER_PROMINENCE_ORDER.indexOf(right.id as (typeof SPEAKER_PROMINENCE_ORDER)[number]);
    const leftRank = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const rightRank = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return leftRank - rightRank || left.data.name.localeCompare(right.data.name, 'fr');
  });
}

/* Un·e speaker n'a plus de champ `track` en frontmatter : son parcours se
 * déduit de ses sessions. Les sessions communes aux deux parcours (keynotes,
 * podcast) ne renseignent rien sur l'appartenance à un parcours, donc seules
 * les sessions decideurs/tech comptent ; en cas de sessions sur plusieurs
 * parcours, la plus matinale l'emporte. */
export function trackForSpeaker(
  speakerId: string,
  sessions: CollectionEntry<'sessions'>[],
): 'decideurs' | 'tech' | undefined {
  const [firstSession] = sessions
    .filter(
      (session): session is CollectionEntry<'sessions'> & { data: { track: 'decideurs' | 'tech' } } =>
        session.data.speakerSlugs.includes(speakerId) &&
        (session.data.track === 'decideurs' || session.data.track === 'tech'),
    )
    .sort((a, b) => a.data.startTime.localeCompare(b.data.startTime));
  return firstSession?.data.track;
}
