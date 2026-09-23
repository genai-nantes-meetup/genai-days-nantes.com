import { capture } from '../lib/analytics';
import type { LabelPlacement } from '../lib/label-collection';
import * as labelCollection from '../lib/label-collection';
import { IS_MY_DAY_ENABLED } from '../lib/features';
import * as myDay from '../lib/my-day';
import {
  ARCHIVE_CHANGE_EVENT,
  ARCHIVE_REFRESH_REQUEST_EVENT,
  ARCHIVE_REQUEST_EVENT,
  ARCHIVE_RESTORE_REQUEST_EVENT,
  ARCHIVE_UPDATE_EVENT,
  initMyDay,
  type ArchiveMethod,
} from './my-day';
import { createPeelSoundController } from './peel-sound';

interface Point {
  x: number;
  y: number;
}

interface PinnedAnchor {
  xAnchor: 'left' | 'right';
  yAnchor: 'top' | 'bottom';
  xOffset: number;
  yOffset: number;
}

interface DragState {
  mode: 'idle' | 'peeling' | 'floating';
  pointerId: number;
  start: Point;
  pointer: Point;
  rect: DOMRect;
  size: Point;
  grabOffset: Point;
  rotation: number;
  previewProgress: number;
  lastProgress: number;
}

const EDGE_GUTTER = 10;
const INITIAL_FOLD = 16;
const PEEL_UNSTICK_PX = 4;
/* L'ombre de pliure garde une boîte fixe et n'est animée qu'en transform :
 * animer left/top/width/height forçait un layout complet du document à
 * chaque frame de décollage. */
const FOLD_SHADOW_BASE_WIDTH = 100;
const FOLD_SHADOW_BASE_HEIGHT = 10;
/* Durée de sortie complète du classeur (90 ms d'amorce + 320 ms de
 * glissement), le temps que la zone de dépôt atteigne sa position finale. */
const ARCHIVE_REVEAL_MS = 420;
const COMPLETION_CONFETTI_DURATION = 3000;
const COMPLETION_CONFETTI_START = 480;
const COMPLETION_CONFETTI_COUNT = 5;
const COMPLETION_CONFETTI_COLORS = ['#3d43ce', '#fe4d1b', '#ffd447', '#f8f7f2', '#e12d28'];

export interface ModalConfettiBurst {
  delay: number;
  xRatio: number;
  yRatio: number;
}

export function createModalConfettiSequence(
  random: () => number = Math.random,
): ModalConfettiBurst[] {
  const anchors = [
    { x: 0.18, y: 0.2 },
    { x: 0.82, y: 0.22 },
    { x: 0.5, y: 0.48 },
    { x: 0.2, y: 0.78 },
    { x: 0.8, y: 0.76 },
  ];

  for (let index = anchors.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [anchors[index], anchors[swapIndex]] = [anchors[swapIndex], anchors[index]];
  }

  const availableDuration = COMPLETION_CONFETTI_DURATION - COMPLETION_CONFETTI_START;
  const slotDuration = availableDuration / COMPLETION_CONFETTI_COUNT;

  return anchors.map((anchor, index) => ({
    delay: Math.round(
      COMPLETION_CONFETTI_START +
      (index * slotDuration) +
      (random() * slotDuration * 0.72),
    ),
    xRatio: clamp(anchor.x + ((random() - 0.5) * 0.14), 0.08, 0.92),
    yRatio: clamp(anchor.y + ((random() - 0.5) * 0.12), 0.1, 0.9),
  }));
}

export function getArchiveVisualViewportTop(
  visualHeight: number,
  visualOffsetTop: number,
  archiveHeight: number,
): number {
  return visualOffsetTop + visualHeight - archiveHeight;
}

export interface ArchiveRestickAffordance {
  enabled: boolean;
  ariaLabel: string;
}

/* La collection liste trois familles d'étiquettes alors qu'une page n'en rend
 * qu'une partie. Une origine présente permet de retrouver l'emplacement prévu
 * par la maquette. Sinon, l'étiquette reste disponible pour un dépôt libre. */
export function getArchiveRestickAffordance(
  labelName: string,
  hasOriginOnPage: boolean,
): ArchiveRestickAffordance {
  const name = labelName.trim();
  const quoted = name ? ` « ${name} »` : '';

  return {
    enabled: true,
    ariaLabel: hasOriginOnPage
      ? `Recoller l’étiquette${quoted} sur la page · Entrée ou Espace la repose à son emplacement d’origine`
      : `Déposer l’étiquette${quoted} sur la page · Entrée ou Espace la place au centre`,
  };
}

/* Placement provisoire écrit au moment où l'étiquette quitte le classeur :
 * elle n'y est plus classée, elle doit donc déjà exister quelque part si la
 * page est rechargée en plein geste. Le dépôt final le remplace. Les
 * coordonnées passent du viewport au document, seul repère stable une fois
 * l'étiquette posée dans le flux. */
export function createLiftPlacement(
  viewportPosition: Point,
  scroll: Point,
  rotation: number,
): LabelPlacement {
  return {
    x: viewportPosition.x + scroll.x,
    y: viewportPosition.y + scroll.y,
    rotation,
    pinned: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* Une étiquette reposée reste dans <main> : accrochée à <body> elle se lisait
 * après le pied de page et le classeur, hors de tout point de repère, et le
 * placement mémorisé rejouait ce déplacement à chaque visite. <main> étant en
 * position statique, le bloc conteneur des coordonnées document ne change
 * pas : les placements déjà enregistrés restent valides. */
function getRestickHost(): HTMLElement {
  return document.querySelector('main') ?? document.body;
}

/* Dimensions mémorisées : setCurl tourne à chaque frame de tirage et à
 * chaque début de survol, souvent juste après une écriture de style. Relire
 * offsetWidth/offsetHeight à ce moment force un layout synchrone de toute la
 * page, ce qui fait sauter les animations sur les pages longues. La taille
 * d'une étiquette ne change qu'au resize : on la mesure à ces moments-là. */
const labelSizes = new WeakMap<HTMLElement, Point>();

function measureLabelSize(label: HTMLElement): Point {
  const size = { x: label.offsetWidth, y: label.offsetHeight };
  labelSizes.set(label, size);
  /* Le CSS du rabat a besoin de la largeur en px pour exprimer son reflet
   * (translate en % mélangerait largeur et hauteur sur un rectangle). */
  label.style.setProperty('--fold-width', `${size.x}px`);
  return size;
}

function getLabelSize(label: HTMLElement): Point {
  return labelSizes.get(label) ?? measureLabelSize(label);
}

function setCurl(
  label: HTMLElement,
  front: HTMLElement,
  back: HTMLElement,
  foldShadow: HTMLElement,
  progress: number,
  baseRotation: number,
): void {
  const { x: width, y: height } = getLabelSize(label);
  const sweep = INITIAL_FOLD + progress * (width + height - INITIAL_FOLD);
  let frontClip: string;
  let backClip: string;
  let creaseStart: Point;
  let creaseEnd: Point;

  if (sweep <= height) {
    const topX = width - sweep;
    frontClip = `polygon(0 0, ${topX}px 0, ${width}px ${sweep}px, 100% 100%, 0 100%)`;
    backClip = `polygon(${topX}px 0, 100% 0, 100% ${sweep}px)`;
    creaseStart = { x: topX, y: 0 };
    creaseEnd = { x: width, y: sweep };
  } else if (sweep <= width) {
    const topX = width - sweep;
    const bottomX = topX + height;
    frontClip = `polygon(0 0, ${topX}px 0, ${bottomX}px 100%, 0 100%)`;
    backClip = `polygon(${topX}px 0, 100% 0, 100% 100%, ${bottomX}px 100%)`;
    creaseStart = { x: topX, y: 0 };
    creaseEnd = { x: bottomX, y: height };
  } else {
    const leftY = sweep - width;
    const bottomX = width + height - sweep;
    frontClip = `polygon(0 ${leftY}px, ${bottomX}px 100%, 0 100%)`;
    backClip = `polygon(0 0, 100% 0, 100% 100%, ${bottomX}px 100%, 0 ${leftY}px)`;
    creaseStart = { x: 0, y: leftY };
    creaseEnd = { x: bottomX, y: height };
  }

  const creaseDx = creaseEnd.x - creaseStart.x;
  const creaseDy = creaseEnd.y - creaseStart.y;
  const creaseLength = Math.max(Math.hypot(creaseDx, creaseDy), 0.01);
  const creaseAngle = Math.atan2(creaseDy, creaseDx) * (180 / Math.PI);

  front.style.clipPath = frontClip;
  back.style.clipPath = backClip;
  back.style.opacity = '1';
  back.style.transform = `matrix(0, 1, 1, 0, ${width - sweep}, ${sweep - width})`;
  foldShadow.style.transform =
    `translate(${creaseStart.x}px, ${creaseStart.y - 5}px) ` +
    `rotate(${creaseAngle}deg) ` +
    `scale(${creaseLength / FOLD_SHADOW_BASE_WIDTH}, ${(10 + progress * 7) / FOLD_SHADOW_BASE_HEIGHT})`;
  foldShadow.style.opacity = `${Math.sin(progress * Math.PI) * 0.78 + 0.16}`;
  /* Tant qu'elle est collée, la carte ne bouge pas d'un poil : seul le pli
   * répond au geste, c'est lui qui matérialise l'effort. */
  label.style.transform = `rotate(${baseRotation}deg)`;
}

function resetCurl(
  label: HTMLElement,
  front: HTMLElement,
  back: HTMLElement,
  foldShadow: HTMLElement,
  rotation: number,
): void {
  setCurl(label, front, back, foldShadow, 0, rotation);
}

/* Une étiquette déplacée garde une taille en pixels pour pouvoir flotter
 * librement hors de son conteneur. On libère temporairement sa hauteur afin
 * de la remesurer après le chargement de la police, puis on la fige à
 * nouveau sans rogner son contenu. */
function measureNaturalHeight(label: HTMLElement): number {
  const previousHeight = label.style.height;
  label.style.height = 'auto';
  const height = label.offsetHeight;
  label.style.height = previousHeight;
  return height;
}

function getArchive(root: ParentNode) {
  const archive = root.querySelector<HTMLElement>('[data-label-archive]');
  const dropzone = root.querySelector<HTMLElement>('[data-label-dropzone]');
  const live = root.querySelector<HTMLElement>('[data-label-archive-live]');
  return { archive, dropzone, live };
}

function moveConfettiCanvasIntoModal(modal: HTMLDialogElement): void {
  const canvas = Array.from(document.body.children).find(
    (element): element is HTMLCanvasElement =>
      element instanceof HTMLCanvasElement &&
      element.style.zIndex === '999999999' &&
      element.style.pointerEvents === 'none',
  );

  if (canvas) modal.append(canvas);
}

/* La libairie confetti (~68 Ko de source) ne sert qu'à cette unique animation
 * de complétion, déclenchée seulement quand quelqu'un termine la collection
 * d'étiquettes : un événement rare que la plupart des visiteurs ne
 * déclenchent jamais. Un import dynamique la sort du bundle initial. */
async function scheduleCompletionConfetti(modal: HTMLDialogElement): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { default: confetti } = await import('@hiseb/confetti');
  if (!modal.open) return;

  const timers = createModalConfettiSequence().map((burst) =>
    window.setTimeout(() => {
      if (!modal.open) return;

      const rect = modal.getBoundingClientRect();
      confetti({
        position: {
          x: rect.left + (rect.width * burst.xRatio),
          y: rect.top + (rect.height * burst.yRatio),
        },
        count: 34,
        size: 1.05,
        velocity: 135,
        fade: true,
        color: COMPLETION_CONFETTI_COLORS,
      });
      moveConfettiCanvasIntoModal(modal);
    }, burst.delay),
  );

  modal.addEventListener('close', () => {
    timers.forEach((timer) => window.clearTimeout(timer));
  }, { once: true });
}

function openCompletionModal(root: ParentNode): void {
  if (labelCollection.hasSeenCompletionModal()) return;

  const modal = root.querySelector<HTMLDialogElement>('[data-label-completion-modal]');
  if (!modal || modal.open) return;

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
  void scheduleCompletionConfetti(modal);
  labelCollection.markCompletionModalSeen();
}

function updateArchive(root: ParentNode): void {
  const archive = root.querySelector<HTMLElement>('[data-label-archive]');
  if (!archive) return;

  const requiredLabelIds = JSON.parse(archive.dataset.requiredLabels || '[]') as string[];
  const total = requiredLabelIds.length;
  const collected = labelCollection.getCollected();
  const collectedSet = new Set(collected);
  const count = requiredLabelIds.filter((labelId) => collectedSet.has(labelId)).length;
  const percentage = total ? Math.min(Math.round((count / total) * 100), 100) : 0;
  const isComplete = labelCollection.hasCollectedEvery(requiredLabelIds);

  archive.classList.toggle('is-available', count > 0);
  archive.classList.toggle('is-complete', isComplete);
  const countLabel = archive.querySelector<HTMLElement>('[data-label-archive-count]');
  if (countLabel) countLabel.textContent = String(count).padStart(2, '0');
  const progress = archive.querySelector<HTMLElement>('[data-label-archive-progress]');
  if (progress) {
    progress.textContent = `${percentage} % COLLECTÉ`;
    progress.hidden = isComplete;
  }
  const rewardLink = archive.querySelector<HTMLElement>('[data-label-archive-reward]');
  /* Une inscription déjà enregistrée garde son chemin d'accès : reprendre une
   * étiquette du classeur pour la recoller dans la page rend la collection
   * incomplète, elle ne doit pas effacer une récompense acquise. */
  if (rewardLink) {
    rewardLink.hidden = !isComplete && !labelCollection.getRewardRegistration();
  }

  const empty = archive.querySelector<HTMLElement>('[data-label-archive-empty]');
  if (empty) empty.hidden = count > 0;

  archive.querySelectorAll<HTMLElement>('[data-label-archive-item]').forEach((item) => {
    item.hidden = !collected.includes(item.dataset.labelId || '');
  });

  /* La journée se réconcilie sur chaque resynchronisation du classeur : une
   * étiquette reprise ne peut plus être posée sur le badge. */
  document.dispatchEvent(new CustomEvent(ARCHIVE_UPDATE_EVENT));

  if (isComplete) openCompletionModal(root);
}

function initArchiveControls(root: ParentNode): void {
  const archive = root.querySelector<HTMLElement>('[data-label-archive]');
  if (!archive) return;

  const tab = archive.querySelector<HTMLButtonElement>('[data-label-archive-tab]');
  const close = archive.querySelector<HTMLButtonElement>('[data-label-archive-close]');
  const reset = archive.querySelector<HTMLButtonElement>('[data-label-archive-reset]');

  const setOpen = (open: boolean) => {
    archive.classList.toggle('is-open', open);
    tab?.setAttribute('aria-expanded', String(open));
  };

  tab?.addEventListener('click', () => setOpen(!archive.classList.contains('is-open')));
  close?.addEventListener('click', () => setOpen(false));
  reset?.addEventListener('click', () => {
    labelCollection.clear();
    myDay.clear();
    window.location.reload();
  });

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    const mobileQuery = window.matchMedia('(max-width: 39.999rem)');
    let viewportFrame = 0;

    const syncArchiveToVisualViewport = () => {
      window.cancelAnimationFrame(viewportFrame);
      viewportFrame = window.requestAnimationFrame(() => {
        if (!mobileQuery.matches) {
          archive.style.removeProperty('top');
          archive.style.removeProperty('bottom');
          return;
        }

        const archiveTop = getArchiveVisualViewportTop(
          visualViewport.height,
          visualViewport.offsetTop,
          archive.offsetHeight,
        );
        archive.style.top = `${archiveTop}px`;
        archive.style.bottom = 'auto';
      });
    };

    if ('ResizeObserver' in window) {
      new ResizeObserver(syncArchiveToVisualViewport).observe(archive);
    }

    visualViewport.addEventListener('resize', syncArchiveToVisualViewport, { passive: true });
    visualViewport.addEventListener('scroll', syncArchiveToVisualViewport, { passive: true });
    visualViewport.addEventListener('scrollend', syncArchiveToVisualViewport, { passive: true });
    window.addEventListener('resize', syncArchiveToVisualViewport, { passive: true });
    window.addEventListener('scroll', syncArchiveToVisualViewport, { passive: true });
    window.addEventListener('scrollend', syncArchiveToVisualViewport, { passive: true });
    window.addEventListener('orientationchange', syncArchiveToVisualViewport, { passive: true });
    syncArchiveToVisualViewport();
  }

  updateArchive(root);
}

function isPointInside(point: Point, rect: DOMRect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function clampPlacement(x: number, y: number, width: number, height: number): Point {
  const visibleGripHeight = clamp(height * 0.28, 36, 64);

  return {
    x: clamp(x, EDGE_GUTTER - width * 0.08, window.innerWidth - width * 0.92 - EDGE_GUTTER),
    /*
     * While floating, the label must be able to overlap the mobile archive
     * dock. Keep only a grabbable strip visible instead of forcing the full
     * sheet above the viewport edge.
     */
    y: clamp(y, EDGE_GUTTER, window.innerHeight - visibleGripHeight),
  };
}

/* Au recollage sur le hero, seule la limite physique de l'affiche compte.
 * Le titre et le CTA ne sont pas des zones interdites : l'étiquette vit
 * dans un calque supérieur et peut donc les recouvrir sans perdre son
 * interaction ni voir sa position d'arrivée corrigée. */
function clampPinnedPlacement(position: Point, size: Point, host: HTMLElement): Point {
  const hostRect = host.getBoundingClientRect();
  const maxX = Math.max(EDGE_GUTTER, hostRect.width - size.x - EDGE_GUTTER);
  const maxY = Math.max(EDGE_GUTTER, hostRect.height - size.y - EDGE_GUTTER);

  return {
    x: clamp(position.x, EDGE_GUTTER, maxX),
    y: clamp(position.y, EDGE_GUTTER, maxY),
  };
}

function clampDocumentPlacement(x: number, y: number, width: number, height: number): Point {
  const documentHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);

  return {
    x: clamp(x, EDGE_GUTTER, Math.max(EDGE_GUTTER, window.innerWidth - width - EDGE_GUTTER)),
    y: clamp(y, EDGE_GUTTER, Math.max(EDGE_GUTTER, documentHeight - height - EDGE_GUTTER)),
  };
}

function getPinnedAnchor(position: Point, size: Point, host: HTMLElement): PinnedAnchor {
  const left = position.x;
  const right = host.clientWidth - position.x - size.x;
  const top = position.y;
  const bottom = host.clientHeight - position.y - size.y;

  return {
    xAnchor: left <= right ? 'left' : 'right',
    yAnchor: top <= bottom ? 'top' : 'bottom',
    xOffset: Math.max(EDGE_GUTTER, Math.min(left, right)),
    yOffset: Math.max(EDGE_GUTTER, Math.min(top, bottom)),
  };
}

function getPositionFromPinnedAnchor(anchor: PinnedAnchor, size: Point, host: HTMLElement): Point {
  return {
    x:
      anchor.xAnchor === 'right'
        ? host.clientWidth - size.x - anchor.xOffset
        : anchor.xOffset,
    y:
      anchor.yAnchor === 'bottom'
        ? host.clientHeight - size.y - anchor.yOffset
        : anchor.yOffset,
  };
}

/* Prise gardée sur une étiquette déjà installée : le classeur en a besoin pour
 * réarmer une étiquette classée, et initLabelEasterEgg, qui rebinde les
 * écouteurs window, ne peut pas être rejoué pour la remettre en service. */
interface OriginControls {
  labelId: string;
  liftFromArchive: (point: Point, pointerId: number) => boolean;
  restoreToOrigin: () => boolean;
}

/* En deçà de ce déplacement, l'appui sur la poignée reste un clic : le
 * recollement se fait alors à l'emplacement d'origine. Sans ce seuil, un clic
 * simple relâcherait l'étiquette au-dessus du classeur, qui la reclasserait
 * aussitôt. */
const ARCHIVE_LIFT_THRESHOLD_PX = 6;

/* La surface de reprise est la fiche entière : c'est l'étiquette elle-même
 * qu'on veut saisir dans le classeur, pas une icône de 33 px. Le bouton reste
 * à côté pour le chemin sans geste (clavier, technologie d'assistance), et la
 * fiche garde son lien au clic simple. */
function initArchiveRestick(root: ParentNode, controls: Map<string, OriginControls>): void {
  const archive = root.querySelector<HTMLElement>('[data-label-archive]');
  if (!archive) return;

  let pending: { origin: OriginControls; pointerId: number; start: Point } | null = null;
  let isGesturing = false;
  let hasLifted = false;

  const endGesture = () => {
    pending = null;
    isGesturing = false;
  };

  window.addEventListener('pointermove', (event) => {
    if (!pending || event.pointerId !== pending.pointerId) return;

    const point = { x: event.clientX, y: event.clientY };
    const travel = Math.hypot(point.x - pending.start.x, point.y - pending.start.y);
    if (travel < ARCHIVE_LIFT_THRESHOLD_PX) return;

    const origin = pending.origin;
    pending = null;
    /* Passé le seuil, le geste est un transport : l'étiquette passe en main et
     * les écouteurs déjà posés par son origine prennent le relais pour le
     * déplacement puis le dépôt. La capture de pointeur est laissée de côté, la
     * fiche du classeur disparaissant sous le doigt dès la reprise. */
    hasLifted = origin.liftFromArchive(point, event.pointerId);
  }, { passive: true });

  window.addEventListener('pointerup', endGesture);
  window.addEventListener('pointercancel', endGesture);

  /* Retirer une fiche du classeur fait remonter les suivantes sous le curseur :
   * le navigateur y accrochait une sélection de texte qui suivait tout le
   * trajet. Elle n'est refusée que pendant le geste, la copie de texte reste
   * possible le reste du temps. */
  document.addEventListener('selectstart', (event) => {
    if (isGesturing) event.preventDefault();
  });

  const createLooseControls = (item: HTMLElement): OriginControls | null => {
    const labelId = item.dataset.labelId;
    const template = item.querySelector<HTMLTemplateElement>('[data-label-restick-template]');
    const source = template?.content.querySelector<HTMLElement>('.site-label')
      ?? item.querySelector<HTMLElement>('.site-label');
    if (!labelId || !source) return null;

    let loose = Array.from(root.querySelectorAll<HTMLElement>('[data-loose-label]'))
      .find((label) => label.dataset.looseLabel === labelId) ?? null;
    let activePointerId = -1;
    let size: Point = { x: 0, y: 0 };
    let grabOffset: Point = { x: 20, y: 20 };
    let rotation = -0.35;

    const beginLooseMove = (event: PointerEvent) => {
      if (!loose || event.button !== 0 || activePointerId !== -1) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = loose.getBoundingClientRect();
      size = {
        x: rect.width || loose.offsetWidth || Number.parseFloat(loose.style.width) || 280,
        y: rect.height || loose.offsetHeight || Number.parseFloat(loose.style.height) || 96,
      };
      grabOffset = {
        x: clamp(event.clientX - rect.left, 0, size.x),
        y: clamp(event.clientY - rect.top, 0, size.y),
      };
      activePointerId = event.pointerId;
      loose.classList.remove('is-placed');
      loose.classList.add('is-lifted');
      loose.style.left = `${rect.left}px`;
      loose.style.top = `${rect.top}px`;
      loose.style.cursor = 'grabbing';
      document.body.append(loose);
    };

    const ensureLooseLabel = () => {
      if (loose) return loose;
      loose = source.cloneNode(true) as HTMLElement;
      loose.dataset.looseLabel = labelId;
      loose.removeAttribute('href');
      loose.setAttribute('role', 'img');
      loose.setAttribute('aria-label', item.querySelector('[data-label-restick-name]')?.getAttribute('data-label-restick-name') ?? 'Étiquette collectée');
      loose.querySelectorAll('a').forEach((link) => link.replaceWith(...link.childNodes));
      loose.addEventListener('dragstart', (event) => event.preventDefault());
      loose.addEventListener('pointerdown', beginLooseMove);
      loose.style.cursor = 'grab';
      loose.style.touchAction = 'none';
      loose.style.userSelect = 'none';
      return loose;
    };

    const keepArchiveOpen = () => {
      archive.classList.add('is-open');
      archive.querySelector('[data-label-archive-tab]')?.setAttribute('aria-expanded', 'true');
    };

    const placeAt = (viewportPoint: Point, pointerId: number): boolean => {
      if (!labelCollection.isCollected(labelId)) return false;
      const label = ensureLooseLabel();
      const sourceRect = source.getBoundingClientRect();
      const isCoverLabel = source.classList.contains('site-label--cover');
      const fallbackWidth = isCoverLabel
        ? Math.min(480, Math.max(300, window.innerWidth * 0.44))
        : 280;
      const width = sourceRect.width || source.offsetWidth || fallbackWidth;
      let height = sourceRect.height || source.offsetHeight;
      if (!height && isCoverLabel) {
        label.style.position = 'fixed';
        label.style.visibility = 'hidden';
        label.style.width = `${width}px`;
        label.style.height = 'auto';
        document.body.append(label);
        height = label.offsetHeight;
        label.style.position = '';
        label.style.visibility = '';
      }
      size = {
        x: width,
        y: height || (isCoverLabel ? 150 : 96),
      };
      grabOffset = { x: Math.min(size.x - 20, Math.max(20, size.x / 2)), y: 20 };
      const position = clampPlacement(
        viewportPoint.x - grabOffset.x,
        viewportPoint.y - grabOffset.y,
        size.x,
        size.y,
      );
      if (!labelCollection.uncollect(
        labelId,
        createLiftPlacement(position, { x: window.scrollX, y: window.scrollY }, rotation),
      )) return false;

      activePointerId = pointerId;
      label.classList.add('is-lifted');
      label.classList.remove('is-placed');
      label.style.width = `${size.x}px`;
      label.style.height = `${size.y}px`;
      label.style.left = `${position.x}px`;
      label.style.top = `${position.y}px`;
      label.style.transform = `rotate(${rotation}deg) scale(1.018)`;
      document.body.append(label);
      updateArchive(root);
      keepArchiveOpen();
      const live = root.querySelector<HTMLElement>('[data-label-archive-live]');
      if (live) live.textContent = 'Étiquette sortie de la collection. Déposez-la sur la page.';
      return true;
    };

    const move = (event: PointerEvent) => {
      if (!loose || event.pointerId !== activePointerId) return;
      const position = clampPlacement(
        event.clientX - grabOffset.x,
        event.clientY - grabOffset.y,
        size.x,
        size.y,
      );
      loose.style.left = `${position.x}px`;
      loose.style.top = `${position.y}px`;
    };

    const drop = (event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>) => {
      if (!loose || event.pointerId !== activePointerId) return;
      activePointerId = -1;
      const point = { x: event.clientX, y: event.clientY };
      const overCollection = isPointInside(point, archive.getBoundingClientRect());
      if (overCollection) {
        labelCollection.collect(labelId);
        loose.remove();
        loose = null;
        updateArchive(root);
        return;
      }

      const viewportPosition = clampPlacement(
        point.x - grabOffset.x,
        point.y - grabOffset.y,
        size.x,
        size.y,
      );
      const documentPosition = clampDocumentPlacement(
        viewportPosition.x + window.scrollX,
        viewportPosition.y + window.scrollY,
        size.x,
        size.y,
      );
      loose.classList.add('is-placed');
      loose.style.cursor = 'grab';
      loose.style.left = `${documentPosition.x}px`;
      loose.style.top = `${documentPosition.y}px`;
      loose.style.transform = `rotate(${rotation}deg)`;
      getRestickHost().append(loose);
      labelCollection.setPlacement(labelId, {
        ...documentPosition,
        rotation,
        pinned: false,
      });
      archive.classList.remove('is-open');
      archive.querySelector('[data-label-archive-tab]')?.setAttribute('aria-expanded', 'false');
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', drop);

    const saved = labelCollection.getPlacement(labelId);
    if (!labelCollection.isCollected(labelId) && saved && !saved.pinned) {
      const label = ensureLooseLabel();
      const isCoverLabel = source.classList.contains('site-label--cover');
      size = {
        x: source.offsetWidth || (isCoverLabel ? Math.min(480, Math.max(300, window.innerWidth * 0.44)) : 280),
        y: source.offsetHeight || (isCoverLabel ? 150 : 96),
      };
      label.classList.add('is-lifted', 'is-placed');
      label.style.width = `${size.x}px`;
      label.style.height = `${size.y}px`;
      label.style.left = `${saved.x}px`;
      label.style.top = `${saved.y}px`;
      label.style.transform = `rotate(${saved.rotation}deg)`;
      getRestickHost().append(label);
    }

    return {
      labelId,
      liftFromArchive: placeAt,
      restoreToOrigin: () => {
        const point = { x: window.innerWidth / 2, y: Math.max(120, window.innerHeight / 3) };
        if (!placeAt(point, -1)) return false;
        drop({ pointerId: -1, clientX: point.x, clientY: point.y });
        return true;
      },
    };
  };

  archive.querySelectorAll<HTMLElement>('[data-label-archive-item]').forEach((item) => {
    const handle = item.querySelector<HTMLButtonElement>('[data-label-archive-restick]');
    const pageOrigin = controls.get(item.dataset.labelId ?? '');
    const origin = pageOrigin ?? createLooseControls(item);
    const affordance = getArchiveRestickAffordance(
      handle?.dataset.labelRestickName ?? '',
      Boolean(pageOrigin),
    );

    if (handle) {
      handle.setAttribute('aria-label', affordance.ariaLabel);
      handle.disabled = !affordance.enabled;
      handle.setAttribute('aria-disabled', String(!affordance.enabled));
    }

    item.classList.toggle('is-restickable', affordance.enabled);
    if (!origin) return;

    /* La fiche est un lien, donc nativement déplaçable : au premier mouvement
     * le navigateur démarrait son propre glisser-déposer de lien, envoyait un
     * pointercancel et cessait de délivrer le moindre pointermove. Le geste
     * attendu ne pouvait pas aboutir. */
    item.addEventListener('dragstart', (event) => event.preventDefault());

    item.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      hasLifted = false;
      isGesturing = true;
      pending = {
        origin,
        pointerId: event.pointerId,
        start: { x: event.clientX, y: event.clientY },
      };
    });

    /* Phase de capture : un clic qui clôt un geste doit mourir avant que
     * page-transition, branché sur document, ne l'emmène en navigation. */
    item.addEventListener('click', (event) => {
      if (hasLifted) {
        hasLifted = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      /* Sans geste, seul le bouton recolle : la fiche, elle, reste un lien
       * vers la page de l'étiquette. */
      if (handle && event.target instanceof Node && handle.contains(event.target)) {
        event.preventDefault();
        origin.restoreToOrigin();
      }
    }, true);
  });
}

export function initLabelEasterEgg(root: ParentNode = document): number {
  initArchiveControls(root);
  const { archive, dropzone, live } = getArchive(root);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  archive?.querySelectorAll<HTMLElement>('[data-label-archive-item]').forEach((item) => {
    const labelId = item.dataset.labelId;
    const template = item.querySelector<HTMLTemplateElement>('[data-label-restick-template]');
    if (!labelId || !template) return;
    const alreadyRendered = Array.from(root.querySelectorAll<HTMLElement>('[data-label-origin]'))
      .some((origin) => origin.dataset.labelId === labelId);
    if (alreadyRendered) return;
    const templateOrigin = template.content.querySelector<HTMLElement>('[data-label-origin]');
    if (!templateOrigin) return;
    const virtualOrigin = templateOrigin.cloneNode(true) as HTMLElement;
    virtualOrigin.dataset.labelVirtualOrigin = '';
    virtualOrigin.hidden = true;
    getRestickHost().append(virtualOrigin);
  });
  const origins = Array.from(root.querySelectorAll<HTMLElement>('[data-label-origin]'));

  const setupOrigin = (origin: HTMLElement): OriginControls | null => {
    const labelId = origin.dataset.labelId;
    const label = origin.querySelector<HTMLElement>('[data-label-card]');
    const front = origin.querySelector<HTMLElement>('[data-label-front]');
    const back = origin.querySelector<HTMLElement>('[data-label-back]');
    const foldShadow = origin.querySelector<HTMLElement>('[data-label-fold-shadow]');
    const corner = origin.querySelector<HTMLButtonElement>('[data-label-corner]');
    const peelAudio = origin.querySelector<HTMLAudioElement>('[data-label-sound]');
    const peelSurface = origin.closest<HTMLElement>('[data-session-cover], [data-label-surface]');
    if (!labelId || !label || !front || !back || !foldShadow || !corner || !peelAudio) return null;
    const isVirtualOrigin = origin.hasAttribute('data-label-virtual-origin');
    const prepareVirtualLabel = () => {
      if (!isVirtualOrigin) return;
      document.body.append(label);
      label.style.width = `${Math.min(480, Math.max(300, window.innerWidth * 0.44))}px`;
      label.style.height = 'auto';
    };

    /* Hôte d'épinglage : l'affiche sticky du hero. Une étiquette recollée
     * dessus y est rattachée en coordonnées relatives, pour rester plaquée
     * avec le décor exactement comme l'étiquette d'origine. Recollée
     * ailleurs, elle vit en coordonnées document et suit le contenu. */
    const pinHost = root.querySelector<HTMLElement>('[data-label-pin-host]');
    let pinnedPlacementAnchor: PinnedAnchor | null = null;
    const baseRotation = Number(origin.dataset.labelRotation ?? -1);
    const state: DragState = {
      mode: 'idle',
      pointerId: -1,
      start: { x: 0, y: 0 },
      pointer: { x: 0, y: 0 },
      rect: label.getBoundingClientRect(),
      size: { ...measureLabelSize(label) },
      grabOffset: { x: 0, y: 0 },
      rotation: baseRotation,
      previewProgress: 0,
      lastProgress: 0,
    };

    /* Une étiquette classée garde tout son câblage : c'est ce qui permet de la
     * reprendre au classeur sans reconstruire d'écouteurs. Seuls son affichage
     * et son placement mémorisé sont neutralisés. */
    const isCollectedAtInit = labelCollection.isCollected(labelId);
    if (isCollectedAtInit) origin.classList.add('is-collected');

    const peelSound = createPeelSoundController(peelAudio);

    const saved = labelCollection.getPlacement(labelId);
    /* Un placement épinglé n'a de sens que sur une page qui possède l'hôte
     * d'épinglage : ses coordonnées sont relatives à lui. Ailleurs (le même
     * labelId peut exister dans un composant sans affiche), on laisse
     * l'étiquette à sa position d'origine plutôt que de réinterpréter ces
     * coordonnées comme des coordonnées document. */
    const applySavedPlacement = () => {
      if (!saved || (saved.pinned && !pinHost)) return;

      prepareVirtualLabel();
      const width = label.offsetWidth;
      const height = measureNaturalHeight(label);
      labelSizes.set(label, { x: width, y: height });
      label.style.setProperty('--fold-width', `${width}px`);
      const host = saved.pinned && pinHost ? pinHost : null;
      const hasSavedAnchor =
        host &&
        (saved.xAnchor === 'left' || saved.xAnchor === 'right') &&
        (saved.yAnchor === 'top' || saved.yAnchor === 'bottom') &&
        typeof saved.xOffset === 'number' &&
        typeof saved.yOffset === 'number';
      const savedAnchor: PinnedAnchor | null = hasSavedAnchor
        ? {
            xAnchor: saved.xAnchor!,
            yAnchor: saved.yAnchor!,
            xOffset: saved.xOffset!,
            yOffset: saved.yOffset!,
          }
        : null;
      const savedPosition = host
        ? savedAnchor
          ? getPositionFromPinnedAnchor(savedAnchor, { x: width, y: height }, host)
          : {
              x: typeof saved.xRatio === 'number' ? saved.xRatio * host.clientWidth : saved.x,
              y: typeof saved.yRatio === 'number' ? saved.yRatio * host.clientHeight : saved.y,
            }
        : { x: saved.x, y: saved.y };
      const placement = host
        ? clampPinnedPlacement(savedPosition, { x: width, y: height }, host)
        : clampDocumentPlacement(savedPosition.x, savedPosition.y, width, height);
      if (host) {
        pinnedPlacementAnchor = getPinnedAnchor(placement, { x: width, y: height }, host);
      }
      origin.classList.add('is-lifted', 'is-placed');
      label.classList.add('is-lifted', 'is-placed');
      label.style.left = `${placement.x}px`;
      label.style.top = `${placement.y}px`;
      label.style.width = `${width}px`;
      label.style.height = `${height}px`;
      state.size = { x: width, y: height };
      state.rotation = saved.rotation;
      label.style.transform = `rotate(${saved.rotation}deg)`;
      (host ?? getRestickHost()).append(label);
      if (host && pinnedPlacementAnchor) {
        labelCollection.setPlacement(labelId, {
          x: placement.x,
          y: placement.y,
          ...pinnedPlacementAnchor,
          rotation: saved.rotation,
          pinned: true,
        });
      }
      corner.setAttribute('aria-label', 'Décoller à nouveau l’étiquette · Entrée ou Espace l’ajoute à la collection');
      // Rejoue l'apparition à l'emplacement restauré : l'inline du <head> a
      // masqué l'étiquette pendant que l'animation initiale tournait à vide.
      label.style.animation = 'none';
      void label.offsetWidth;
      label.style.animation = '';
    };

    /* Boîte fixe posée une fois : l'ombre de pliure n'est ensuite pilotée
     * qu'en transform (translate, rotate, scale), jamais en layout. */
    foldShadow.style.left = '0';
    foldShadow.style.top = '0';
    foldShadow.style.width = `${FOLD_SHADOW_BASE_WIDTH}px`;
    foldShadow.style.height = `${FOLD_SHADOW_BASE_HEIGHT}px`;

    /* Trois niveaux de décollage au repos : tease automatique (la languette
     * se soulève seule), carte survolée (pli à mi-chemin), coin survolé
     * (aperçu complet). Hors tirage, toute la géométrie dérive de la seule
     * variable animée --fold-sweep : clip avant, clip et position du rabat
     * bougent dans le même recalcul de style, sans désynchronisation
     * possible. Le tease reste sous le logo du coin ; l'aperçu carte peut
     * en rogner l'angle de quelques pixels, l'aperçu complet le recouvre. */
    const TEASE_HOLD_MS = 1250;
    const TEASE_PERIOD_MS = 5200;
    const cornerPreviewSweep = () => Math.min(56, getLabelSize(label).y * 0.32);
    const cardPreviewSweep = () => Math.min(34, getLabelSize(label).y * 0.21);
    const teaseSweep = () => Math.min(24, getLabelSize(label).y * 0.15);
    const sweepToProgress = (sweep: number) => {
      const { x: width, y: height } = getLabelSize(label);
      return (sweep - INITIAL_FOLD) / (width + height - INITIAL_FOLD);
    };

    let resizeFrame = 0;
    const syncPlacedLabelAfterResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const size = measureLabelSize(label);
        state.size = { ...size };
        if (state.mode !== 'idle' || !label.classList.contains('is-placed')) return;

        if (pinHost && label.parentElement === pinHost) {
          const currentX = Number.parseFloat(label.style.left) || 0;
          const currentY = Number.parseFloat(label.style.top) || 0;
          const anchor =
            pinnedPlacementAnchor ??
            getPinnedAnchor({ x: currentX, y: currentY }, size, pinHost);
          const placement = clampPinnedPlacement(
            getPositionFromPinnedAnchor(anchor, size, pinHost),
            size,
            pinHost,
          );
          pinnedPlacementAnchor = getPinnedAnchor(placement, size, pinHost);
          label.style.left = `${placement.x}px`;
          label.style.top = `${placement.y}px`;
          labelCollection.setPlacement(labelId, {
            x: placement.x,
            y: placement.y,
            ...pinnedPlacementAnchor,
            rotation: state.rotation,
            pinned: true,
          });
          return;
        }

        const placement = clampDocumentPlacement(
          Number.parseFloat(label.style.left) || label.getBoundingClientRect().left,
          Number.parseFloat(label.style.top) || label.getBoundingClientRect().top + window.scrollY,
          size.x,
          size.y,
        );
        label.style.left = `${placement.x}px`;
        label.style.top = `${placement.y}px`;
        labelCollection.setPlacement(labelId, {
          x: placement.x,
          y: placement.y,
          rotation: state.rotation,
          pinned: false,
        });
      });
    };

    window.addEventListener('resize', syncPlacedLabelAfterResize, { passive: true });

    let isCardHovered = false;
    let isCornerHovered = false;
    let isLabelInView = false;
    let teaseTimers: number[] = [];

    const stopTease = () => {
      for (const timer of teaseTimers) window.clearTimeout(timer);
      teaseTimers = [];
    };

    const mayTease = () =>
      state.mode === 'idle' &&
      !isCardHovered &&
      !isCornerHovered &&
      isLabelInView &&
      !prefersReducedMotion.matches;

    /* Rendu des états au repos : une seule écriture animée (--fold-sweep),
     * le CSS dérive le reste. Les styles inline d'un éventuel tirage
     * précédent sont levés pour rendre la main aux règles CSS. L'inclinaison
     * de la carte et l'ombre de pliure gardent leurs transitions propres :
     * élements doux, tolérants au décalage. */
    const setRestingFold = (sweep: number, dx: number, dy: number) => {
      front.style.clipPath = '';
      back.style.clipPath = '';
      back.style.transform = '';
      back.style.opacity = '1';
      label.style.setProperty('--fold-sweep', `${sweep}px`);
      const { x: width } = getLabelSize(label);
      const liftX = clamp(dx * 0.08, -18, 18);
      const liftY = clamp(dy * 0.08, -18, 18);
      label.style.transform =
        `translate3d(${liftX}px, ${liftY}px, 0) rotate(${state.rotation + dx * 0.015}deg) ` +
        `perspective(900px) rotateX(${clamp(-dy * 0.045, -7, 7)}deg) rotateY(${clamp(dx * 0.045, -7, 7)}deg)`;
      const progress = clamp(sweepToProgress(sweep), 0, 1);
      foldShadow.style.transform =
        `translate(${width - sweep}px, -5px) rotate(45deg) ` +
        `scale(${(sweep * Math.SQRT2) / FOLD_SHADOW_BASE_WIDTH}, ${(10 + progress * 7) / FOLD_SHADOW_BASE_HEIGHT})`;
      foldShadow.style.opacity = `${Math.sin(progress * Math.PI) * 0.78 + 0.16}`;
    };

    const playTeaseCycle = () => {
      if (!mayTease()) return;
      state.previewProgress = sweepToProgress(teaseSweep());
      setRestingFold(teaseSweep(), -3, 2);
      teaseTimers.push(
        window.setTimeout(() => {
          if (!mayTease()) return;
          state.previewProgress = 0;
          setRestingFold(INITIAL_FOLD, 0, 0);
        }, TEASE_HOLD_MS),
      );
      teaseTimers.push(window.setTimeout(playTeaseCycle, TEASE_PERIOD_MS));
    };

    const scheduleTease = (delay: number) => {
      stopTease();
      teaseTimers.push(window.setTimeout(playTeaseCycle, delay));
    };

    const renderRestingCurl = () => {
      if (state.mode !== 'idle') return;
      if (isCornerHovered) {
        state.previewProgress = sweepToProgress(cornerPreviewSweep());
        setRestingFold(cornerPreviewSweep(), -10, 8);
      } else if (isCardHovered) {
        state.previewProgress = sweepToProgress(cardPreviewSweep());
        setRestingFold(cardPreviewSweep(), -6, 5);
      } else {
        state.previewProgress = 0;
        setRestingFold(INITIAL_FOLD, 0, 0);
      }
    };

    /* Un recollage laisse les styles inline du tirage en place le temps de
     * se poser; on rend ensuite la main à la géométrie CSS. */
    const scheduleRestingHandoff = () => {
      window.setTimeout(() => {
        if (state.mode === 'idle') renderRestingCurl();
      }, 240);
    };

    label.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      isCardHovered = true;
      if (state.mode !== 'idle') return;
      stopTease();
      renderRestingCurl();
    });

    label.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      isCardHovered = false;
      isCornerHovered = false;
      if (state.mode !== 'idle') return;
      renderRestingCurl();
      scheduleTease(TEASE_PERIOD_MS);
    });

    const teaseViewObserver = new IntersectionObserver((entries) => {
      isLabelInView = entries[entries.length - 1].isIntersecting;
      if (isLabelInView) scheduleTease(2400);
      else stopTease();
    });

    /* Débrancher le tease au classement doit rester réversible : disconnect()
     * rendrait l'observer inutilisable pour une étiquette reprise plus tard,
     * unobserve() laisse la même instance disponible. */
    const observeTease = () => {
      teaseViewObserver.observe(label);
    };

    const unobserveTease = () => {
      teaseViewObserver.unobserve(label);
      isLabelInView = false;
      stopTease();
    };

    observeTease();

    const settleStoredPlacement = () => {
      if (!isCollectedAtInit) applySavedPlacement();
      // Lève le masque anti-téléportation posé par l'inline du <head> : à
      // partir d'ici, l'état localStorage est appliqué.
      origin.classList.add('is-storage-settled');
      setRestingFold(INITIAL_FOLD, 0, 0);
    };

    if (!isCollectedAtInit && saved && !(saved.pinned && !pinHost)) {
      const fontsReady = document.fonts?.ready;
      if (fontsReady && typeof fontsReady.then === 'function') {
        fontsReady.then(settleStoredPlacement, settleStoredPlacement);
      } else {
        settleStoredPlacement();
      }
    } else {
      settleStoredPlacement();
    }

    let archiveRevealTimer = 0;

    const revealArchive = () => {
      if (!archive) return;

      window.clearTimeout(archiveRevealTimer);
      archive.classList.add('is-reveal-ready');
      archive?.classList.remove('is-open');
      archive.querySelector('[data-label-archive-tab]')?.setAttribute('aria-expanded', 'true');
      archiveRevealTimer = window.setTimeout(() => {
        archive.classList.add('is-revealed');
      }, 90);
    };

    const isOverArchive = (point: Point) =>
      Boolean(
        (dropzone && isPointInside(point, dropzone.getBoundingClientRect())) ||
        (archive?.classList.contains('is-revealed') && isPointInside(point, archive.getBoundingClientRect())),
      );

    /* Le tiroir peut rester ouvert après un dépôt : c'est le cas quand
     * l'étiquette a été reprise dans le classeur. L'état annoncé suit donc la
     * classe, il ne retombe pas systématiquement à « replié ». */
    const syncArchiveTabExpanded = () => {
      archive
        ?.querySelector('[data-label-archive-tab]')
        ?.setAttribute('aria-expanded', String(archive.classList.contains('is-open')));
    };

    const concealArchive = () => {
      window.clearTimeout(archiveRevealTimer);
      archive?.classList.remove('is-revealed');
      archive?.classList.remove('is-reveal-ready');
      syncArchiveTabExpanded();
      dropzone?.classList.remove('is-targeted');
    };

    const startPeel = (point: Point, pointerId: number, timestamp: number) => {
      stopTease();
      state.mode = 'peeling';
      state.pointerId = pointerId;
      state.start = point;
      state.pointer = point;
      state.rect = label.getBoundingClientRect();
      state.size = { x: label.offsetWidth, y: measureNaturalHeight(label) };
      state.grabOffset = { x: state.size.x - 20, y: 20 };
      if (label.classList.contains('is-placed')) {
        label.style.left = `${state.rect.left}px`;
        label.style.top = `${state.rect.top}px`;
      }
      origin.classList.add('is-peeling');
      origin.classList.remove('is-placed');
      peelSurface?.classList.add('is-peeling-label');
      label.classList.remove('is-placed');
      label.style.transition = 'none';
      state.lastProgress = state.previewProgress;
      peelSound?.begin(state.previewProgress, timestamp);
      if (live) live.textContent = 'Étiquette soulevée. Tirez pour la décoller.';
    };

    const detach = (point: Point) => {
      const width = state.size.x;
      const height = state.size.y;
      const position = clampPlacement(point.x - state.grabOffset.x, point.y - state.grabOffset.y, width, height);

      peelSound?.complete();
      state.mode = 'floating';
      state.previewProgress = 0;
      origin.classList.remove('is-peeling');
      origin.classList.add('is-lifted');
      peelSurface?.classList.remove('is-peeling-label');
      label.classList.add('is-lifted');
      front.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
      back.style.opacity = '0';
      back.style.visibility = 'hidden';
      foldShadow.style.opacity = '0';
      foldShadow.style.visibility = 'hidden';
      document.body.append(label);
      label.style.width = `${width}px`;
      label.style.height = `${height}px`;
      label.style.left = `${position.x}px`;
      label.style.top = `${position.y}px`;
      label.style.transform = `rotate(${state.rotation}deg) scale(1.018)`;
      label.style.transition = 'filter 180ms ease, transform 180ms ease';
      revealArchive();
      if (live) live.textContent = 'Étiquette décollée. Déplacez-la ou déposez-la dans la collection.';
    };

    const moveFloating = (point: Point) => {
      const position = clampPlacement(
        point.x - state.grabOffset.x,
        point.y - state.grabOffset.y,
        state.size.x,
        state.size.y,
      );
      const velocity = point.x - state.pointer.x;
      state.rotation = clamp(state.rotation + velocity * 0.018, -5.5, 4.5);
      state.pointer = point;
      label.style.left = `${position.x}px`;
      label.style.top = `${position.y}px`;
      label.style.transform = `rotate(${state.rotation}deg) scale(1.018)`;

      if (dropzone) dropzone.classList.toggle('is-targeted', isOverArchive(point));
    };

    /* Le dépôt est le même code quelle que soit la provenance : ce drapeau est
     * la seule chose qui distingue un recollement venu du classeur d'un simple
     * repositionnement, pour ne mesurer que le premier. */
    let isLiftedFromArchive = false;

    const restick = () => {
      peelSound?.rewind();
      const rect = label.getBoundingClientRect();
      const hostRect = pinHost?.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const isOverPinHost = Boolean(
        hostRect &&
          centerX >= hostRect.left &&
          centerX <= hostRect.right &&
          centerY >= hostRect.top &&
          centerY <= hostRect.bottom,
      );
      let position: Point;
      if (pinHost && hostRect && isOverPinHost) {
        position = clampPinnedPlacement(
          { x: rect.left - hostRect.left, y: rect.top - hostRect.top },
          state.size,
          pinHost,
        );
        pinHost.append(label);
        pinnedPlacementAnchor = getPinnedAnchor(position, state.size, pinHost);
      } else {
        position = clampDocumentPlacement(
          rect.left + window.scrollX,
          rect.top + window.scrollY,
          state.size.x,
          state.size.y,
        );
        getRestickHost().append(label);
        pinnedPlacementAnchor = null;
      }
      label.style.left = `${position.x}px`;
      label.style.top = `${position.y}px`;
      label.style.transform = `rotate(${state.rotation}deg) scale(0.992)`;
      origin.classList.add('is-placed');
      label.classList.add('is-placed');
      back.style.visibility = '';
      foldShadow.style.visibility = '';
      resetCurl(label, front, back, foldShadow, state.rotation);
      labelCollection.setPlacement(labelId, {
        x: position.x,
        y: position.y,
        ...pinnedPlacementAnchor,
        rotation: state.rotation,
        pinned: Boolean(pinHost && hostRect && isOverPinHost),
      });
      window.setTimeout(() => {
        label.style.transform = `rotate(${state.rotation}deg) scale(1)`;
      }, 90);
      /* Une fois posée, la transition inline du détachement est levée, sinon
       * elle masquerait la transition CSS de --fold-sweep sur les survols
       * suivants de l'étiquette recollée. */
      window.setTimeout(() => {
        label.style.transition = '';
      }, 320);
      corner.setAttribute('aria-label', 'Décoller à nouveau l’étiquette · Entrée ou Espace l’ajoute à la collection');
      if (live) live.textContent = 'Étiquette recollée. Son nouvel emplacement est mémorisé.';
      concealArchive();
      peelSurface?.classList.remove('is-peeling-label');
      state.mode = 'idle';
      state.previewProgress = 0;
      scheduleRestingHandoff();
      scheduleTease(TEASE_PERIOD_MS);
      if (isLiftedFromArchive) {
        isLiftedFromArchive = false;
        capture('sticker_restuck', { label_id: labelId, method: 'pointer' });
      }
    };

    let isKeyboardArchiving = false;
    /* Provenance du classement en cours, rapportée dans label-archive:change :
     * le geste, la touche, ou le bouton « Je viens » d'une carte du programme. */
    let archiveMethod: ArchiveMethod = 'pointer';

    /* Stockage bloqué ou saturé : le classement n'a pas eu lieu. L'étiquette
     * doit redevenir visible et manipulable, sinon elle reste invisible et
     * inerte derrière une confirmation mensongère. */
    const restoreAfterFailedArchive = (wasFloating: boolean) => {
      /* Le classement au clavier a envoyé le focus sur l'onglet du classeur,
       * que concealArchive va masquer : sans reprise, le focus retomberait
       * sur body. */
      const shouldReturnFocusToCorner = isKeyboardArchiving;
      isKeyboardArchiving = false;
      archiveMethod = 'pointer';
      label.style.pointerEvents = '';
      label.style.transition = '';
      label.style.filter = '';
      label.style.opacity = '';
      label.style.transform = `rotate(${state.rotation}deg)`;
      concealArchive();

      if (wasFloating) {
        state.mode = 'floating';
        restick();
      } else {
        label.style.transform = '';
        renderRestingCurl();
        scheduleTease(TEASE_PERIOD_MS);
      }

      if (shouldReturnFocusToCorner) corner.focus();

      if (live) {
        live.textContent = 'Impossible de classer l’étiquette : le stockage du navigateur est bloqué.';
      }
    };

    const archiveLabel = () => {
      const wasFloating = state.mode === 'floating';
      peelSound?.complete();
      const target = dropzone?.getBoundingClientRect();
      const rect = label.getBoundingClientRect();
      const toX = target ? target.left + target.width / 2 - rect.left - rect.width / 2 : 0;
      const toY = target ? target.top + target.height / 2 - rect.top - rect.height / 2 : 0;

      label.style.pointerEvents = 'none';
      label.style.transition = 'transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 360ms ease, filter 300ms ease';
      label.style.transform = `translate3d(${toX}px, ${toY}px, 0) rotate(${state.rotation + 7}deg) scale(0.16)`;
      label.style.filter = 'drop-shadow(0 0 0 transparent)';
      label.style.opacity = '0';

      window.setTimeout(() => {
        if (!labelCollection.collect(labelId)) {
          restoreAfterFailedArchive(wasFloating);
          return;
        }

        isLiftedFromArchive = false;
        origin.classList.add('is-collected');
        unobserveTease();
        label.hidden = true;
        updateArchive(root);
        archive?.classList.remove('is-revealed', 'is-reveal-ready');
        archive?.classList.add('is-open', 'is-available');
        archive?.querySelector('[data-label-archive-tab]')?.setAttribute('aria-expanded', 'true');
        if (live) live.textContent = 'Étiquette ajoutée à la collection.';
        document.dispatchEvent(
          new CustomEvent(ARCHIVE_CHANGE_EVENT, { detail: { labelId, method: archiveMethod } }),
        );
        archiveMethod = 'pointer';
      }, 390);
      state.mode = 'idle';
      state.previewProgress = 0;
    };

    corner.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      corner.setPointerCapture(event.pointerId);
      startPeel({ x: event.clientX, y: event.clientY }, event.pointerId, event.timeStamp);
    });

    corner.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      isCornerHovered = true;
      if (state.mode !== 'idle') return;
      stopTease();
      renderRestingCurl();
    });

    corner.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      isCornerHovered = false;
      if (state.mode !== 'idle') return;
      renderRestingCurl();
    });

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== state.pointerId || state.mode === 'idle') return;
      const point = { x: event.clientX, y: event.clientY };

      if (state.mode === 'peeling') {
        const dx = point.x - state.start.x;
        const dy = point.y - state.start.y;
        const peelDistance = clamp(
          Math.min(state.size.x * 0.72, window.innerHeight * 0.48),
          210,
          430,
        );
        /* Progression = projection du geste sur l'axe naturel d'épluchage
         * (le coin part vers le bas-gauche, à travers l'étiquette). Tirer
         * vers l'extérieur du coin ou à contresens ne déplie rien : seule
         * la composante dans le bon sens compte. */
        const peelPull = (dy - dx) * Math.SQRT1_2;
        /* Résistance de la colle : le pli répond tout de suite mais freiné,
         * puis rattrape la main en fin de course. L'exposant reste doux :
         * trop de retenue et le geste paraît mort. */
        const pull = Math.max(0, peelPull - PEEL_UNSTICK_PX);
        const dragProgress = clamp(pull / (peelDistance - PEEL_UNSTICK_PX), 0, 1);
        const resistedProgress = Math.pow(dragProgress, 1.35);
        const progress =
          state.previewProgress + (1 - state.previewProgress) * resistedProgress;
        state.lastProgress = progress;
        setCurl(label, front, back, foldShadow, progress, state.rotation);
        peelSound?.update(progress, event.timeStamp);
        if (dragProgress >= 0.985) detach(point);
      } else {
        moveFloating(point);
      }
    };

    const finishPointer = (event: PointerEvent) => {
      if (event.pointerId !== state.pointerId || state.mode === 'idle') return;
      const point = { x: event.clientX, y: event.clientY };

      if (state.mode === 'peeling') {
        origin.classList.remove('is-peeling');
        peelSurface?.classList.remove('is-peeling-label');
        /* Bascule la géométrie inline du tirage vers la géométrie CSS au
         * même sweep, transitions encore coupées, puis anime le repli via
         * --fold-sweep. Le reflow force la prise en compte avant la
         * réactivation des transitions. */
        const { x: width, y: height } = getLabelSize(label);
        label.style.setProperty(
          '--fold-sweep',
          `${INITIAL_FOLD + state.lastProgress * (width + height - INITIAL_FOLD)}px`,
        );
        front.style.clipPath = '';
        back.style.clipPath = '';
        back.style.transform = '';
        void label.offsetWidth;
        label.style.transition = '';
        peelSound?.rewind();
        concealArchive();
        state.mode = 'idle';
        state.previewProgress = 0;
        renderRestingCurl();
        scheduleTease(TEASE_PERIOD_MS);
        if (live) live.textContent = 'L’étiquette s’est recollée.';
      } else if (isOverArchive(point)) {
        archiveLabel();
      } else {
        restick();
      }
      state.pointerId = -1;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', finishPointer);

    /* Chemin clavier : une seule action. L'étiquette n'a pas d'état flottant
     * à manipuler à la touche, elle part directement au classeur, et le
     * focus suit vers l'onglet du classeur avant que le bouton de coin ne
     * disparaisse. Le tiroir est révélé d'abord pour que le vol vise sa
     * position finale. Échap et les flèches restent réservés au geste. */
    const archiveWithKeyboard = (method: ArchiveMethod = 'keyboard') => {
      if (isKeyboardArchiving || state.mode !== 'idle') return;
      isKeyboardArchiving = true;
      archiveMethod = method;
      stopTease();
      revealArchive();
      archive?.querySelector<HTMLElement>('[data-label-archive-tab]')?.focus();
      window.setTimeout(archiveLabel, ARCHIVE_REVEAL_MS);
    };

    /* Le bouton « Je viens » d'une carte du programme classe l'étiquette de
     * la carte sans geste : même vol que le chemin clavier, même classement. */
    origin.addEventListener(ARCHIVE_REQUEST_EVENT, () => {
      if (labelCollection.isCollected(labelId)) return;
      archiveWithKeyboard('button');
    });

    corner.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (state.mode === 'floating') {
          archiveLabel();
          return;
        }

        archiveWithKeyboard();
        return;
      }

      if (event.key === 'Escape' && state.mode === 'floating') {
        event.preventDefault();
        restick();
      }

      if (state.mode === 'floating' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const rect = label.getBoundingClientRect();
        const step = event.shiftKey ? 40 : 12;
        const x = rect.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
        const y = rect.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
        const position = clampPlacement(x, y, state.size.x, state.size.y);
        label.style.left = `${position.x}px`;
        label.style.top = `${position.y}px`;
      }
    });

    /* Reprise d'une étiquette classée. Deux masquages coexistent selon la façon
     * dont elle a été rangée : un classement en direct laisse le noeud dans
     * <body> avec hidden et les styles inline du vol vers le classeur, un
     * rechargement le laisse dans sa coquille sous .is-collected. Les deux sont
     * levés ici, avec le masque anti-téléportation de l'inline du <head>. */
    const revealCollectedNode = () => {
      origin.classList.remove('is-collected');
      origin.classList.add('is-storage-settled');
      label.hidden = false;
      label.style.pointerEvents = '';
      label.style.transition = '';
      label.style.filter = '';
      label.style.opacity = '';
      label.style.transform = `rotate(${state.rotation}deg)`;
    };

    const hideAsCollectedAgain = () => {
      origin.classList.add('is-collected');
      label.hidden = true;
    };

    const reportStorageRefusal = () => {
      if (live) {
        live.textContent = 'Impossible de reprendre l’étiquette : le stockage du navigateur est bloqué.';
      }
    };

    /* Le classeur ne doit pas se refermer sous les doigts : reprendre la
     * dernière fiche ramène le compteur à zéro, donc retire is-available, et
     * sans is-open l'aside redevient invisible et non focusable en plein
     * geste. */
    const keepArchiveOpen = () => {
      archive?.classList.add('is-open');
      syncArchiveTabExpanded();
    };

    const liftFromArchive = (point: Point, pointerId: number): boolean => {
      if (state.mode !== 'idle' || !labelCollection.isCollected(labelId)) return false;

      stopTease();
      revealCollectedNode();
      prepareVirtualLabel();
      origin.classList.remove('is-placed');
      label.classList.remove('is-placed');
      /* Remesure obligatoire avant tout transport : masquée, l'étiquette
       * mesurait zéro et aurait flotté sous la forme d'un rectangle vide. */
      const width = label.offsetWidth;
      const height = measureNaturalHeight(label);
      labelSizes.set(label, { x: width, y: height });
      label.style.setProperty('--fold-width', `${width}px`);
      state.size = { x: width, y: height };
      // Même prise que sur une étiquette fraîchement décollée : elle pend sous
      // le doigt par son coin haut droit.
      state.grabOffset = { x: width - 20, y: 20 };
      const position = clampPlacement(
        point.x - state.grabOffset.x,
        point.y - state.grabOffset.y,
        width,
        height,
      );

      if (
        !labelCollection.uncollect(
          labelId,
          createLiftPlacement(position, { x: window.scrollX, y: window.scrollY }, state.rotation),
        )
      ) {
        hideAsCollectedAgain();
        reportStorageRefusal();
        return false;
      }

      isLiftedFromArchive = true;
      state.mode = 'floating';
      state.pointerId = pointerId;
      state.pointer = point;
      state.previewProgress = 0;
      origin.classList.add('is-lifted');
      label.classList.add('is-lifted');
      front.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
      back.style.opacity = '0';
      back.style.visibility = 'hidden';
      foldShadow.style.opacity = '0';
      foldShadow.style.visibility = 'hidden';
      document.body.append(label);
      label.style.width = `${width}px`;
      label.style.height = `${height}px`;
      label.style.left = `${position.x}px`;
      label.style.top = `${position.y}px`;
      label.style.transform = `rotate(${state.rotation}deg) scale(1.018)`;
      /* Les neutralisations de mouvement vivent dans les styles scopés du
       * composant : une transition posée en inline leur échappe, celle-ci est
       * donc décidée en JS. */
      label.style.transition = prefersReducedMotion.matches
        ? 'none'
        : 'filter 180ms ease, transform 180ms ease';
      observeTease();
      updateArchive(root);
      keepArchiveOpen();
      if (live) live.textContent = 'Étiquette sortie de la collection. Déposez-la sur la page.';
      return true;
    };

    /* Reprise sans geste (clavier, clic simple sur la poignée) : l'étiquette
     * repart à son emplacement d'origine plutôt qu'à un point choisi, et son
     * placement mémorisé est effacé pour qu'elle y reste au rechargement. Le
     * focus suit le coin, sinon il retomberait sur body avec la fiche du
     * classeur que updateArchive vient de masquer. */
    const restoreToOrigin = (method: ArchiveMethod = 'keyboard'): boolean => {
      if (state.mode !== 'idle' || !labelCollection.isCollected(labelId)) return false;

      if (!labelCollection.uncollect(labelId)) {
        reportStorageRefusal();
        return false;
      }

      stopTease();
      revealCollectedNode();
      if (isVirtualOrigin) {
        prepareVirtualLabel();
        const width = label.offsetWidth || Math.min(480, Math.max(300, window.innerWidth * 0.44));
        const height = measureNaturalHeight(label) || 150;
        const viewportPosition = clampPlacement(
          window.innerWidth / 2 - width / 2,
          Math.max(120, window.innerHeight / 3) - height / 2,
          width,
          height,
        );
        const position = clampDocumentPlacement(
          viewportPosition.x + window.scrollX,
          viewportPosition.y + window.scrollY,
          width,
          height,
        );
        state.size = { x: width, y: height };
        label.classList.add('is-lifted', 'is-placed');
        label.style.left = `${position.x}px`;
        label.style.top = `${position.y}px`;
        label.style.width = `${width}px`;
        label.style.height = `${height}px`;
        label.style.transform = `rotate(${state.rotation}deg)`;
        resetCurl(label, front, back, foldShadow, state.rotation);
        getRestickHost().append(label);
        labelCollection.setPlacement(labelId, {
          ...position,
          rotation: state.rotation,
          pinned: false,
        });
        updateArchive(root);
        keepArchiveOpen();
        corner.focus();
        if (live) live.textContent = 'Étiquette recollée sur la page.';
        capture('sticker_restuck', { label_id: labelId, method });
        return true;
      }
      origin.classList.remove('is-lifted', 'is-placed');
      label.classList.remove('is-lifted', 'is-placed');
      label.style.left = '';
      label.style.top = '';
      label.style.width = '';
      label.style.height = '';
      label.style.transform = '';
      front.style.clipPath = '';
      back.style.opacity = '';
      back.style.visibility = '';
      foldShadow.style.opacity = '';
      foldShadow.style.visibility = '';
      origin.append(label);
      state.size = { ...measureLabelSize(label) };
      state.rotation = baseRotation;
      pinnedPlacementAnchor = null;
      corner.setAttribute('aria-label', 'Décoller l’étiquette · Entrée ou Espace l’ajoute à la collection');
      observeTease();
      renderRestingCurl();
      scheduleTease(TEASE_PERIOD_MS);
      updateArchive(root);
      keepArchiveOpen();
      corner.focus();
      if (live) live.textContent = 'Étiquette recollée à son emplacement d’origine.';
      capture('sticker_restuck', { label_id: labelId, method });
      return true;
    };

    origin.addEventListener(ARCHIVE_RESTORE_REQUEST_EVENT, (event) => {
      const detail = (event as CustomEvent<{ method?: ArchiveMethod }>).detail;
      restoreToOrigin(detail?.method ?? 'button');
    });

    return { labelId, liftFromArchive, restoreToOrigin };
  };

  const originControls = new Map<string, OriginControls>();
  origins.forEach((origin) => {
    const controls = setupOrigin(origin);
    if (controls) originControls.set(controls.labelId, controls);
  });

  document.addEventListener(ARCHIVE_CHANGE_EVENT, () => updateArchive(root));
  document.addEventListener(ARCHIVE_REFRESH_REQUEST_EVENT, () => updateArchive(root));
  initArchiveRestick(root, originControls);
  if (IS_MY_DAY_ENABLED) initMyDay(root);

  return origins.length;
}
