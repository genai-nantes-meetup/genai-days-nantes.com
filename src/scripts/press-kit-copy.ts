import { getDocumentLocale } from '../lib/i18n';

const RESET_DELAY = 2200;
const ANNOUNCE_DELAY = 60;

const messages = {
  fr: {
    fallbackLabel: 'Copier',
    successLabel: 'Copié',
    errorLabel: 'Copie impossible',
    successAnnouncement: 'Texte copié dans le presse-papiers',
    errorAnnouncement: 'La copie a échoué',
  },
  en: {
    fallbackLabel: 'Copy',
    successLabel: 'Copied',
    errorLabel: 'Copy failed',
    successAnnouncement: 'Text copied to clipboard',
    errorAnnouncement: 'Could not copy the text',
  },
};

function getCopyValue(target: HTMLElement): string {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.value;
  }

  return target.textContent?.trim() ?? '';
}

async function writeToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function initPressKitCopy(root: ParentNode = document): number {
  const localeMessages = messages[getDocumentLocale()];
  const triggers = root.querySelectorAll<HTMLButtonElement>('[data-copy-target]');
  const liveRegion = root.querySelector<HTMLElement>('[data-copy-live]');
  const resetTimeoutIds = new WeakMap<HTMLButtonElement, number>();
  let announceTimeoutId = 0;
  let clearTimeoutId = 0;

  /* Le seul retour de copie est le libellé du bouton, or le changement de nom
   * accessible d'un élément déjà focalisé n'est pas annoncé par toutes les
   * configurations : le résultat passe donc par une live region dédiée. Elle est
   * vidée avant chaque message pour qu'une seconde copie identique soit relue,
   * puis au bout de RESET_DELAY pour ne pas être rejouée au rechargement du
   * tampon du lecteur d'écran. */
  const announceCopyResult = (message: string) => {
    if (!liveRegion) return;

    window.clearTimeout(announceTimeoutId);
    window.clearTimeout(clearTimeoutId);
    liveRegion.textContent = '';

    announceTimeoutId = window.setTimeout(() => {
      liveRegion.textContent = message;
    }, ANNOUNCE_DELAY);

    clearTimeoutId = window.setTimeout(() => {
      liveRegion.textContent = '';
    }, RESET_DELAY);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', async () => {
      const targetId = trigger.dataset.copyTarget;
      if (!targetId) return;

      const target = root.querySelector<HTMLElement>(`#${targetId}`);
      if (!target) return;

      const label = trigger.querySelector<HTMLElement>('[data-copy-action-label]');
      const defaultLabel = trigger.dataset.copyLabel ?? label?.textContent?.trim() ?? trigger.textContent?.trim() ?? localeMessages.fallbackLabel;
      const setLabel = (value: string) => {
        if (label) {
          label.textContent = value;
          return;
        }

        trigger.textContent = value;
      };

      const activeResetTimeoutId = resetTimeoutIds.get(trigger);
      if (activeResetTimeoutId) window.clearTimeout(activeResetTimeoutId);
      delete trigger.dataset.copyState;
      void trigger.offsetWidth;

      try {
        await writeToClipboard(getCopyValue(target));
        setLabel(localeMessages.successLabel);
        trigger.dataset.copyState = 'success';
        announceCopyResult(localeMessages.successAnnouncement);
      } catch {
        setLabel(localeMessages.errorLabel);
        trigger.dataset.copyState = 'error';
        announceCopyResult(localeMessages.errorAnnouncement);
      }

      const resetTimeoutId = window.setTimeout(() => {
        setLabel(defaultLabel);
        delete trigger.dataset.copyState;
      }, RESET_DELAY);
      resetTimeoutIds.set(trigger, resetTimeoutId);
    });
  });

  return triggers.length;
}
