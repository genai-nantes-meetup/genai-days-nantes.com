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
  'julien-lesaicherre',
  'quentin-adam',
  'theo-hubert',
  'nicolas-martignole',
] as const;

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
