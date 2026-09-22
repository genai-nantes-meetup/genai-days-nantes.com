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
  title: string;
  kind: ProgrammeSlotKind;
  durationMinutes?: number;
  detail?: string;
}

export const PROGRAMME_SLOTS: ProgrammeSlot[] = [
  {
    time: '08:30',
    title: 'Accueil visiteurs, partenaires et café',
    kind: 'arrival',
  },
  {
    time: '09:15',
    title: "Keynote d'ouverture",
    kind: 'keynote',
    durationMinutes: 15,
  },
  {
    time: '09:30',
    title: 'Déplacement vers les parcours',
    kind: 'transition',
    durationMinutes: 10,
  },
  {
    time: '09:40',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '10:20',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '11:00',
    title: 'Déplacement et pause café',
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '11:15',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '11:55',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 30,
  },
  {
    time: '12:25',
    title: 'Déjeuner',
    kind: 'meal',
    durationMinutes: 80,
  },
  {
    time: '13:45',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '14:25',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '15:05',
    title: 'Déplacement et pause café',
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '15:20',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '16:00',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '16:40',
    title: 'Déplacement et pause café',
    kind: 'transition',
    durationMinutes: 15,
  },
  {
    time: '16:55',
    title: 'Conférences',
    kind: 'conference',
    durationMinutes: 40,
  },
  {
    time: '17:35',
    title: 'Keynote de clôture',
    kind: 'keynote',
    durationMinutes: 55,
  },
  {
    time: '18:00',
    title: 'Afterwork',
    kind: 'social',
  },
  {
    time: '22:00',
    title: 'Clôture',
    kind: 'closing',
  },
];
