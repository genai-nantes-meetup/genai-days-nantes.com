/* « Ma journée » : les sessions qu'un visiteur prévoit de suivre, une par
 * créneau horaire. Ce state vit à côté de la collection d'étiquettes
 * (label-collection.ts) et ne la remplace pas : la récompense exige toutes
 * les étiquettes des deux parcours, alors qu'une journée n'en garde qu'une
 * par créneau. Dériver l'une de l'autre casserait dès qu'un visiteur
 * collectionne les deux conférences d'un même horaire. */

const STORAGE_KEY = 'genaidays:my-day:v1';
const SESSION_LABEL_PREFIX = 'session-';

export type StartTime = string;
export type SessionId = string;

interface MyDayState {
  /* Un créneau (heure de début « HH:MM ») ne porte qu'une session : c'est la
   * contrainte physique du jeu, on ne peut pas être dans deux salles. */
  choices: Record<StartTime, SessionId>;
}

export interface ChooseSessionResult {
  ok: boolean;
  /* Session que ce choix a délogée du même créneau, s'il y en avait une. */
  replaced?: SessionId;
}

function emptyState(): MyDayState {
  return { choices: {} };
}

function readState(): MyDayState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw);
    const choices: Record<StartTime, SessionId> = {};
    if (parsed.choices && typeof parsed.choices === 'object') {
      for (const [startTime, sessionId] of Object.entries(parsed.choices)) {
        if (typeof sessionId === 'string' && sessionId) choices[startTime] = sessionId;
      }
    }
    return { choices };
  } catch {
    return emptyState();
  }
}

/* Même contrat que label-collection : false quand le stockage refuse
 * l'écriture, pour que l'interface n'annonce pas un choix perdu. */
function writeState(state: MyDayState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function sessionIdFromLabelId(labelId: string): SessionId | null {
  if (!labelId.startsWith(SESSION_LABEL_PREFIX)) return null;
  const sessionId = labelId.slice(SESSION_LABEL_PREFIX.length);
  return sessionId || null;
}

export function labelIdFromSessionId(sessionId: SessionId): string {
  return `${SESSION_LABEL_PREFIX}${sessionId}`;
}

export function getChoices(): Record<StartTime, SessionId> {
  return readState().choices;
}

export function getChosenSessionAt(startTime: StartTime): SessionId | undefined {
  return readState().choices[startTime];
}

export function isChosen(sessionId: SessionId): boolean {
  return Object.values(readState().choices).includes(sessionId);
}

/* Pose la session sur son créneau et en déloge l'occupante précédente, en une
 * seule écriture : un échec du stockage laisse la journée telle qu'elle était,
 * jamais avec un créneau vidé et rien à la place. */
export function chooseSession(sessionId: SessionId, startTime: StartTime): ChooseSessionResult {
  const state = readState();
  const previous = state.choices[startTime];
  if (previous === sessionId) return { ok: true };

  for (const [time, chosen] of Object.entries(state.choices)) {
    if (chosen === sessionId) delete state.choices[time];
  }
  state.choices[startTime] = sessionId;

  if (!writeState(state)) return { ok: false };
  return previous ? { ok: true, replaced: previous } : { ok: true };
}

export function removeSession(sessionId: SessionId): boolean {
  const state = readState();
  let hasChanged = false;
  for (const [time, chosen] of Object.entries(state.choices)) {
    if (chosen !== sessionId) continue;
    delete state.choices[time];
    hasChanged = true;
  }
  if (!hasChanged) return true;
  return writeState(state);
}

/* Réconciliation avec le classeur : une étiquette reprise du classeur et
 * recollée sur la page n'est plus en possession du visiteur, elle ne peut pas
 * rester sur son badge. Retourne les sessions retirées. */
export function retainOnlySessions(sessionIds: SessionId[]): SessionId[] {
  const state = readState();
  const kept = new Set(sessionIds);
  const removed: SessionId[] = [];
  for (const [time, chosen] of Object.entries(state.choices)) {
    if (kept.has(chosen)) continue;
    delete state.choices[time];
    removed.push(chosen);
  }
  if (removed.length > 0) writeState(state);
  return removed;
}

export function clear(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Le reset reste effectif pour la page courante même sans accès au stockage.
  }
}
