import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n';

export type ProgrammeSlotKind =
  | 'arrival'
  | 'keynote'
  | 'conference'
  | 'transition'
  | 'meal'
  | 'social'
  | 'closing';

export interface ProgrammeSlot {
  time: string;
  title: Record<Locale, string>;
  kind: ProgrammeSlotKind;
  durationMinutes?: number;
  detail?: Record<Locale, string>;
}

export const PROGRAMME_SLOTS: ProgrammeSlot[] = [
  {
    time: '08:30',
    title: { fr: 'Accueil visiteurs, partenaires et café', en: 'Check-in and welcome coffee for attendees and partners' },
    kind: 'arrival',
  },
  {
    time: '09:15',
    title: { fr: "Keynote d'ouverture", en: 'Opening keynote' },
    kind: 'keynote',
    durationMinutes: 15,
  },
  {
    time: '09:30',
    title: { fr: 'Déplacement vers les parcours', en: 'Move to the track rooms' },
    kind: 'transition',
    durationMinutes: 10,
  },
  {
    time: '09:40',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '10:20',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '11:00',
    title: { fr: 'Déplacement et pause café', en: 'Room change and coffee break' },
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '11:15',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '11:55',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 30,
  },
  {
    time: '12:25',
    title: { fr: 'Déjeuner', en: 'Lunch' },
    kind: 'meal',
    durationMinutes: 80,
  },
  {
    time: '13:45',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '14:25',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '15:05',
    title: { fr: 'Déplacement et pause café', en: 'Room change and coffee break' },
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '15:20',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '16:00',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '16:40',
    title: { fr: 'Déplacement et pause café', en: 'Room change and coffee break' },
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '16:55',
    title: { fr: 'Conférences', en: 'Talks' },
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '17:35',
    title: { fr: 'Keynote de clôture', en: 'Closing keynote' },
    kind: 'keynote',
    durationMinutes: 15,
  },
  {
    time: '18:00',
    title: { fr: 'Afterwork', en: 'Afterwork' },
    kind: 'social',
  },
  {
    time: '22:00',
    title: { fr: 'Clôture', en: 'Close' },
    kind: 'closing',
  },
];

/* Single source of truth for the day's timeline: the /programme page and the
 * public sessions API both read PROGRAMME_SLOTS. A common keynote slot is
 * replaced by its collection session when one starts at the same time. */
export const COMMON_TRACK_ID = 'commun';

export function getSlotId(slot: ProgrammeSlot): string {
  return `${slot.kind}-${slot.time.replace(':', '')}`;
}

export function findCommonSessionAt<T extends { data: { startTime: string; track: string } }>(
  sessions: T[],
  time: string,
): T | undefined {
  return sessions.find((session) => session.data.startTime === time && session.data.track === COMMON_TRACK_ID);
}

/* Slots with no collection session of their own: breaks, lunch and any keynote
 * that has no session file yet. */
export function getSessionlessSlots<T extends { data: { startTime: string; track: string } }>(
  sessions: T[],
): ProgrammeSlot[] {
  return PROGRAMME_SLOTS.filter((slot) => {
    if (slot.kind === 'transition' || slot.kind === 'meal') return true;
    return slot.kind === 'keynote' && !findCommonSessionAt(sessions, slot.time);
  });
}

/* Partagé par /programme/[session] et son wrapper anglais. */
export async function getSessionPagePaths() {
  const sessions = await getCollection('sessions');
  const speakers = await getCollection('speakers');
  const tracks = await getCollection('tracks');
  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));
  const trackById = new Map(tracks.map((track) => [track.id, track]));

  return sessions.map((session) => {
    const sameTrackSessions = sessions
      .filter((candidate) => candidate.data.track === session.data.track)
      .sort((a, b) => a.data.startTime.localeCompare(b.data.startTime));
    const sessionIndex = sameTrackSessions.findIndex((candidate) => candidate.id === session.id);

    return {
      params: { session: session.id },
      props: {
        session,
        track: trackById.get(session.data.track),
        previousSession: sameTrackSessions[sessionIndex - 1],
        nextSession: sameTrackSessions[sessionIndex + 1],
        speakers: session.data.speakerSlugs
          .map((slug) => speakerById.get(slug))
          .filter((speaker): speaker is CollectionEntry<'speakers'> => Boolean(speaker)),
      },
    };
  });
}
