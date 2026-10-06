import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n';

export const SPEAKER_TARGET = 20;

type SpeakerEventRole = NonNullable<CollectionEntry<'speakers'>['data']['eventRole']>;

export const SPEAKER_EVENT_ROLE_LABELS = {
  fr: {
    jury: 'Jury du Startup Contest',
    animateur: 'Animateur du Startup Contest',
    finaliste: 'Finaliste du Startup Contest',
    'monsieur-loyal': 'Monsieur Loyal',
    'madame-loyale': 'Madame Loyale',
  },
  /* « Monsieur Loyal » est le présentateur de cirque : l'anglais garde le
   * rôle, maître de cérémonie, plutôt que la référence. */
  en: {
    jury: 'Startup Contest judge',
    animateur: 'Startup Contest host',
    finaliste: 'Startup Contest finalist',
    'monsieur-loyal': 'Master of ceremonies',
    'madame-loyale': 'Master of ceremonies',
  },
} as const satisfies Record<Locale, Record<SpeakerEventRole, string>>;

export const SPEAKER_EVENT_ROLE_SHORT_LABELS = {
  fr: {
    jury: 'Jury',
    animateur: 'Animateur',
    finaliste: 'Finaliste Startup Contest',
    'monsieur-loyal': 'Monsieur Loyal',
    'madame-loyale': 'Madame Loyale',
  },
  en: {
    jury: 'Judge',
    animateur: 'Host',
    finaliste: 'Startup Contest finalist',
    'monsieur-loyal': 'Master of ceremonies',
    'madame-loyale': 'Master of ceremonies',
  },
} as const satisfies Record<Locale, Record<SpeakerEventRole, string>>;

export const SPEAKER_PROMINENCE_ORDER = [
  'christelle-morancais',
  'jean-baptiste-kempf',
  'julien-lesaicherre',
  'regis-dubrulle',
  'charles-gorintin',
  'quentin-adam',
  'theo-hubert',
  'nicolas-martignole',
  'gael-brisson',
] as const;

/* Pitcheurs du Startup Contest : après les autres speakers, avant les MC. */
export const SPEAKER_STARTUP_CONTEST_PITCHERS_ORDER = ['emmanuel-marboeuf'] as const;

/* MC de la journée : toujours en fin de liste, après tous les autres speakers. */
export const SPEAKER_MASTERS_OF_CEREMONIES_ORDER = [
  'annabelle-koster',
  'marie-fleur-sacreste',
  'florian-herveou',
  'jaafar-steiblen-raji',
] as const;

/* Dimensions réelles des fichiers portrait, non dérivables du schéma de la
 * collection speakers (pas de champ photoWidth/photoHeight en frontmatter).
 * Partagées entre toutes les vues qui affichent un portrait, pour réserver
 * l'espace d'image avant chargement et éviter un décalage de mise en page. */
export const SPEAKER_PORTRAIT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'annabelle-koster': { width: 800, height: 800 },
  'camille-croze': { width: 400, height: 400 },
  'charles-gorintin': { width: 1000, height: 1000 },
  'christelle-morancais': { width: 952, height: 952 },
  'constance-nebbula': { width: 832, height: 832 },
  'david-leaurant': { width: 800, height: 800 },
  'emmanuel-marboeuf': { width: 800, height: 800 },
  'florian-herveou': { width: 600, height: 600 },
  'gael-brisson': { width: 1024, height: 1024 },
  'jaafar-steiblen-raji': { width: 800, height: 920 },
  'julien-lesaicherre': { width: 800, height: 800 },
  'laurent-duthoit': { width: 1000, height: 1000 },
  'marie-fleur-sacreste': { width: 800, height: 800 },
  'nicolas-martignole': { width: 1448, height: 1086 },
  'jean-baptiste-kempf': { width: 1200, height: 1801 },
  'quentin-adam': { width: 800, height: 800 },
  'regis-dubrulle': { width: 1000, height: 1000 },
  'sebastien-le-corfec': { width: 760, height: 760 },
  'thomas-mathieu': { width: 1000, height: 1000 },
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
  'emmanuel-marboeuf': '/speakers/emmanuel-marboeuf-480-optimized.webp',
  'gael-brisson': '/speakers/gael-brisson-480-optimized.webp',
  'jaafar-steiblen-raji': '/speakers/jaafar-steiblen-raji-480-optimized.webp',
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

/* Ordre d'affichage : speakers en vedette (SPEAKER_PROMINENCE_ORDER), autres
 * speakers par ordre alphabétique, pitcheurs du Startup Contest, puis MC.
 * Chaque groupe suit l'ordre de son tableau, sauf « autres » (alphabétique). */
const SPEAKER_GROUP_OTHERS = 1;

function speakerGroupAndRank(id: string): [group: number, rank: number] {
  const prominenceIndex = (SPEAKER_PROMINENCE_ORDER as readonly string[]).indexOf(id);
  if (prominenceIndex !== -1) return [0, prominenceIndex];

  const pitcherIndex = (SPEAKER_STARTUP_CONTEST_PITCHERS_ORDER as readonly string[]).indexOf(id);
  if (pitcherIndex !== -1) return [SPEAKER_GROUP_OTHERS + 1, pitcherIndex];

  const masterOfCeremoniesIndex = (SPEAKER_MASTERS_OF_CEREMONIES_ORDER as readonly string[]).indexOf(id);
  if (masterOfCeremoniesIndex !== -1) return [SPEAKER_GROUP_OTHERS + 2, masterOfCeremoniesIndex];

  return [SPEAKER_GROUP_OTHERS, 0];
}

export function sortSpeakersByProminence<T extends { id: string; data: { name: string } }>(speakers: T[]) {
  return [...speakers].sort((left, right) => {
    const [leftGroup, leftRank] = speakerGroupAndRank(left.id);
    const [rightGroup, rightRank] = speakerGroupAndRank(right.id);

    return (
      leftGroup - rightGroup || leftRank - rightRank || left.data.name.localeCompare(right.data.name, 'fr')
    );
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

/* Partagé par /speakers/[speaker] et son wrapper anglais. */
export async function getSpeakerPagePaths() {
  const speakers = await getCollection('speakers');
  const sessions = await getCollection('sessions');

  return speakers.map((speaker) => ({
    params: { speaker: speaker.id },
    props: {
      speaker,
      sessions: sessions.filter((session) => session.data.speakerSlugs.includes(speaker.id)),
    },
  }));
}
