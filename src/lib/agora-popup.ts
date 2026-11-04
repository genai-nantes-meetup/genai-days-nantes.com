import eventData from '../content/event.json';

/* Popup qui pousse les visiteurs mobiles vers Agora (programme + networking)
 * le jour de l'événement. Le site est prérendu : la date se vérifie côté
 * client, à l'heure de Nantes, quel que soit le fuseau du téléphone. */

export const AGORA_POPUP_STORAGE_KEY = 'genaidays:agora-popup:v1';

/* Fuseau de l'événement : un visiteur à 00:30 le 17 à Nantes doit voir la
 * popup même si son téléphone est réglé sur un autre fuseau. */
const EVENT_TIME_ZONE = 'Europe/Paris';

export const AGORA_POPUP_DATES: readonly string[] = [eventData.date];

/* La locale en-CA formate en AAAA-MM-JJ, le format de event.json. */
const PARIS_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getParisDate(now: Date): string {
  return PARIS_DATE_FORMAT.format(now);
}

export function isAgoraPopupDay(now: Date = new Date()): boolean {
  return AGORA_POPUP_DATES.includes(getParisDate(now));
}

/* Stockage indisponible (navigation privée stricte) : la popup reste
 * affichable plutôt que de faire échouer la page. */
export function isAgoraPopupDismissed(): boolean {
  try {
    return window.localStorage.getItem(AGORA_POPUP_STORAGE_KEY) === 'dismissed';
  } catch {
    return false;
  }
}

/* Même contrat que my-day : false quand le stockage refuse l'écriture. */
export function dismissAgoraPopup(): boolean {
  try {
    window.localStorage.setItem(AGORA_POPUP_STORAGE_KEY, 'dismissed');
    return true;
  } catch {
    return false;
  }
}
