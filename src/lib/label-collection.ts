const STORAGE_KEY = 'genaidays:label-archive:v5';
const REWARD_STORAGE_KEY = 'genaidays:sticker-reward:v1';

export interface LabelPlacement {
  x: number;
  y: number;
  rotation: number;
  /* Les ratios assurent la migration des anciens placements. Les ancres et
   * leurs retraits conservent ensuite un bord stable quand le viewport
   * change de largeur, sans laisser l'étiquette sortir de l'affiche. */
  xRatio?: number;
  yRatio?: number;
  xAnchor?: 'left' | 'right';
  yAnchor?: 'top' | 'bottom';
  xOffset?: number;
  yOffset?: number;
  /* true : coordonnées relatives à l'hôte d'épinglage (l'affiche sticky du
   * hero), l'étiquette reste plaquée avec le décor comme à l'origine.
   * false ou absent : coordonnées document, l'étiquette suit le contenu. */
  pinned?: boolean;
}

interface LabelArchiveState {
  collected: string[];
  placements: Record<string, LabelPlacement>;
}

interface LabelRewardState {
  completionModalSeen: boolean;
  registration?: {
    firstName: string;
    savedAt: string;
  };
}

function emptyState(): LabelArchiveState {
  return { collected: [], placements: {} };
}

function emptyRewardState(): LabelRewardState {
  return { completionModalSeen: false };
}

function readState(): LabelArchiveState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw);
    return {
      collected: Array.isArray(parsed.collected) ? parsed.collected : [],
      placements: parsed.placements && typeof parsed.placements === 'object' ? parsed.placements : {},
    };
  } catch {
    return emptyState();
  }
}

/* Returns false when storage refused the write, so callers that confirm an
 * archival to the visitor can tell a real one from a lost one. */
function writeState(state: LabelArchiveState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // The easter egg remains usable when storage is unavailable; it simply will not persist.
    return false;
  }
}

function readRewardState(): LabelRewardState {
  try {
    const raw = window.localStorage.getItem(REWARD_STORAGE_KEY);
    if (!raw) return emptyRewardState();

    const parsed = JSON.parse(raw);
    const firstName = typeof parsed.registration?.firstName === 'string'
      ? parsed.registration.firstName.trim()
      : '';
    const savedAt = typeof parsed.registration?.savedAt === 'string'
      ? parsed.registration.savedAt
      : '';

    return {
      completionModalSeen: parsed.completionModalSeen === true,
      registration: firstName && savedAt ? { firstName, savedAt } : undefined,
    };
  } catch {
    return emptyRewardState();
  }
}

function writeRewardState(state: LabelRewardState): void {
  try {
    window.localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Reward access can still continue during the current navigation.
  }
}

export function getCollected(): string[] {
  return readState().collected;
}

export function hasCollectedEvery(labelIds: string[]): boolean {
  if (labelIds.length === 0) return false;

  const collected = new Set(getCollected());
  return labelIds.every((labelId) => collected.has(labelId));
}

export function isCollected(labelId: string): boolean {
  return getCollected().includes(labelId);
}

export function collect(labelId: string): boolean {
  const state = readState();
  if (!state.collected.includes(labelId)) state.collected.push(labelId);
  delete state.placements[labelId];
  return writeState(state);
}

/* Opération inverse de collect(), en une seule lecture-écriture : sortir l'id
 * de la collection puis inscrire son placement en deux temps laisserait, si la
 * seconde écriture échouait, une étiquette ni classée ni posée, donc invisible
 * partout. Sans placement, l'étiquette retrouve son emplacement d'origine dans
 * la page. Le booléen rendu permet d'annuler le geste quand le stockage refuse
 * l'écriture, comme collect(). */
export function uncollect(labelId: string, placement?: LabelPlacement): boolean {
  const state = readState();
  state.collected = state.collected.filter((id) => id !== labelId);
  if (placement) state.placements[labelId] = placement;
  else delete state.placements[labelId];
  return writeState(state);
}

export function getPlacement(labelId: string): LabelPlacement | undefined {
  return readState().placements[labelId];
}

export function setPlacement(labelId: string, placement: LabelPlacement): void {
  const state = readState();
  state.placements[labelId] = placement;
  writeState(state);
}

export function clearPlacement(labelId: string): void {
  const state = readState();
  delete state.placements[labelId];
  writeState(state);
}

export function hasSeenCompletionModal(): boolean {
  return readRewardState().completionModalSeen;
}

export function markCompletionModalSeen(): void {
  const state = readRewardState();
  state.completionModalSeen = true;
  writeRewardState(state);
}

export function saveRewardRegistration(firstName: string): void {
  const state = readRewardState();
  state.completionModalSeen = true;
  state.registration = {
    firstName: firstName.trim(),
    savedAt: new Date().toISOString(),
  };
  writeRewardState(state);
}

export function getRewardRegistration(): LabelRewardState['registration'] {
  return readRewardState().registration;
}

export function clear(): void {
  writeState(emptyState());
  try {
    window.localStorage.removeItem(REWARD_STORAGE_KEY);
  } catch {
    // The reset remains effective for the current page even without storage access.
  }
}
