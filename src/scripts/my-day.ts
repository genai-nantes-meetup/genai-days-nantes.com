import { capture } from '../lib/analytics';
import * as labelCollection from '../lib/label-collection';
import * as myDay from '../lib/my-day';

/* Demande de classement adressée à une étiquette depuis le bouton d'une carte
 * du programme. L'origine rejoue le même classement que le geste manuel. */
export const ARCHIVE_REQUEST_EVENT = 'label-origin:archive-request';
export const ARCHIVE_RESTORE_REQUEST_EVENT = 'label-origin:restore-request';
export const ARCHIVE_REFRESH_REQUEST_EVENT = 'label-archive:refresh-request';
export const ARCHIVE_CHANGE_EVENT = 'label-archive:change';
export const ARCHIVE_UPDATE_EVENT = 'label-archive:update';

export type ArchiveMethod = 'pointer' | 'keyboard' | 'button';

interface DaySession {
  sessionId: string;
  labelId: string;
  startTime: string;
  track: string;
  title: string;
}

export function describeSessionChosen(title: string, startTime: string, replacedTitle?: string): string {
  if (replacedTitle) {
    return `« ${title} » remplace « ${replacedTitle} » sur le créneau de ${startTime}.`;
  }
  return `« ${title} » ajoutée à ma journée, créneau de ${startTime}.`;
}

export function describeSessionRemoved(title: string, startTime: string): string {
  return `« ${title} » retirée de ma journée. Le créneau de ${startTime} est libre.`;
}

function readSessions(archive: HTMLElement): Map<string, DaySession> {
  const sessions = new Map<string, DaySession>();
  archive.querySelectorAll<HTMLElement>('[data-label-archive-item][data-session-id]').forEach((item) => {
    const sessionId = item.dataset.sessionId;
    const startTime = item.dataset.sessionStart;
    if (!sessionId || !startTime) return;
    sessions.set(sessionId, {
      sessionId,
      labelId: item.dataset.labelId ?? myDay.labelIdFromSessionId(sessionId),
      startTime,
      track: item.dataset.sessionTrack ?? '',
      title: item.dataset.sessionTitle ?? sessionId,
    });
  });
  return sessions;
}

let activeInstance: AbortController | null = null;

export function initMyDay(root: ParentNode = document): number {
  activeInstance?.abort();
  activeInstance = null;

  const archive = root.querySelector<HTMLElement>('[data-label-archive]');
  if (!archive) return 0;

  const sessions = readSessions(archive);
  if (sessions.size === 0) return 0;

  const instance = new AbortController();
  activeInstance = instance;
  const { signal } = instance;
  const live = root.querySelector<HTMLElement>('[data-label-archive-live]');

  const announce = (message: string) => {
    if (live) live.textContent = message;
  };

  const releaseSessionLabel = (sessionId: string) => {
    const labelId = myDay.labelIdFromSessionId(sessionId);
    const origin = root.querySelector<HTMLElement>(`[data-label-origin][data-label-id="${labelId}"]`);
    origin?.dispatchEvent(
      new CustomEvent(ARCHIVE_RESTORE_REQUEST_EVENT, { detail: { method: 'button' } }),
    );

    if (labelCollection.isCollected(labelId) && labelCollection.uncollect(labelId)) {
      document.dispatchEvent(new CustomEvent(ARCHIVE_REFRESH_REQUEST_EVENT));
    }
  };

  const collectedSessionIds = () =>
    labelCollection
      .getCollected()
      .map((labelId) => myDay.sessionIdFromLabelId(labelId))
      .filter((sessionId): sessionId is string => Boolean(sessionId));

  const render = () => {
    const collected = new Set(collectedSessionIds());
    myDay.retainOnlySessions(Array.from(collected));
    const chosen = new Set(Object.values(myDay.getChoices()));

    archive.querySelectorAll<HTMLElement>('[data-label-archive-item][data-session-id]').forEach((item) => {
      const sessionId = item.dataset.sessionId ?? '';
      const isChosen = chosen.has(sessionId);
      item.dataset.myDayState = isChosen ? 'chosen' : collected.has(sessionId) ? 'collected' : 'free';
      item.querySelectorAll<HTMLElement>('[data-my-day-choice-marker]').forEach((marker) => {
        marker.hidden = !isChosen;
      });
    });

    root.querySelectorAll<HTMLElement>('[data-my-day-session]').forEach((host) => {
      const sessionId = host.dataset.myDaySession ?? '';
      const state = chosen.has(sessionId) ? 'chosen' : collected.has(sessionId) ? 'collected' : 'free';
      host.dataset.myDayState = state;
      host.querySelectorAll<HTMLElement>('[data-my-day-toggle]').forEach((toggle) => {
        const isChosen = state === 'chosen';
        const title = sessions.get(sessionId)?.title ?? sessionId;
        const label = isChosen ? 'Retirer de ma journée' : 'Ajouter à ma journée';
        toggle.setAttribute('aria-pressed', String(isChosen));
        toggle.setAttribute('aria-label', `Inclure « ${title} » dans ma journée`);
        toggle.setAttribute('title', label);
        toggle.querySelectorAll<HTMLElement>('[data-my-day-toggle-label]').forEach((text) => {
          text.textContent = label;
        });
      });
    });
  };

  const choose = (sessionId: string, method: ArchiveMethod): boolean => {
    const session = sessions.get(sessionId);
    if (!session) return false;

    const result = myDay.chooseSession(sessionId, session.startTime);
    if (!result.ok) {
      announce('Impossible d’enregistrer ce choix : le stockage du navigateur est bloqué.');
      return false;
    }

    const replaced = result.replaced ? sessions.get(result.replaced) : undefined;
    if (result.replaced) releaseSessionLabel(result.replaced);
    render();
    announce(describeSessionChosen(session.title, session.startTime, replaced?.title));
    capture('session_added_to_day', {
      session_id: sessionId,
      slot: session.startTime,
      track: session.track,
      method,
      ...(result.replaced ? { replaced_session_id: result.replaced } : {}),
    });
    return true;
  };

  const remove = (sessionId: string, method: ArchiveMethod): boolean => {
    const session = sessions.get(sessionId);
    if (!session) return false;

    if (!myDay.removeSession(sessionId)) {
      announce('Impossible de retirer cette session : le stockage du navigateur est bloqué.');
      return false;
    }

    releaseSessionLabel(sessionId);
    render();
    announce(describeSessionRemoved(session.title, session.startTime));
    capture('session_removed_from_day', { session_id: sessionId, slot: session.startTime, method });
    return true;
  };

  document.addEventListener(
    ARCHIVE_CHANGE_EVENT,
    (event) => {
      const detail = (event as CustomEvent<{ labelId?: string; method?: ArchiveMethod }>).detail ?? {};
      const sessionId = myDay.sessionIdFromLabelId(detail.labelId ?? '');
      if (sessionId && sessions.has(sessionId)) choose(sessionId, detail.method ?? 'pointer');
      else render();
    },
    { signal },
  );

  document.addEventListener(ARCHIVE_UPDATE_EVENT, render, { signal });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const toggle = target.closest<HTMLElement>('[data-my-day-toggle]');
    if (!toggle) return;

    const host = toggle.closest<HTMLElement>('[data-my-day-session]');
    const sessionId = host?.dataset.myDaySession;
    if (!sessionId || !sessions.has(sessionId)) return;

    if (myDay.isChosen(sessionId)) {
      remove(sessionId, 'button');
      return;
    }

    if (collectedSessionIds().includes(sessionId)) {
      choose(sessionId, 'button');
      return;
    }

    const labelId = myDay.labelIdFromSessionId(sessionId);
    const origin = root.querySelector<HTMLElement>(
      `[data-label-origin][data-label-id="${labelId}"]:not(.is-collected)`,
    );
    if (origin) {
      origin.dispatchEvent(new CustomEvent(ARCHIVE_REQUEST_EVENT, { detail: { method: 'button' } }));
      return;
    }

    if (!labelCollection.collect(labelId)) {
      announce('Impossible d’enregistrer ce choix : le stockage du navigateur est bloqué.');
      return;
    }
    document.dispatchEvent(
      new CustomEvent(ARCHIVE_CHANGE_EVENT, { detail: { labelId, method: 'button' } }),
    );
  }, { signal });

  render();
  return 1;
}
