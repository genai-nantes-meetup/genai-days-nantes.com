/**
 * Bande de dissolution du hero, inspirée de la mécanique lamalama.com :
 * une grille de points façon demi-teinte riso, uniquement crème, qui
 * transforme l'affiche en fond de la section suivante. L'ombre de lisibilité
 * du titre est portée par le scrim CSS : le shader ne s'occupe que de la
 * transition.
 *
 * Chorégraphie calquée sur la référence, exprimée en deux rendez-vous dont
 * on déduit le point de départ et la vitesse de la ligne :
 * - à l'arrivée sur la page, la bande est entièrement sous le premier écran ;
 * - elle franchit le bas du viewport dès le début du geste de scroll ;
 * - elle remonte nettement plus vite que le contenu, rejoint le dessous du
 *   titre sans jamais le dépasser, s'y verrouille, puis sort par le haut à
 *   la vitesse du contenu, avec lui.
 *
 * La géométrie est FIXE dans le canvas : c'est la section hero qui la fait
 * défiler à la vitesse du contenu. L'overtake est ajouté via u_line,
 * recalculé à chaque frame côté JS : une seule source de vérité partagée avec
 * le clip de l'affiche épinglée.
 *
 * Le même rendu pilote le dolly-in : l'affiche zoome doucement pendant la
 * course sticky (la caméra s'approche du centre du visuel pendant que le contenu
 * s'en détache), recadrée par l'overflow du backdrop.
 *
 * Sans WebGL, le scrim CSS reste seul en place et il n'y a simplement pas de
 * dissolution : le composant est purement progressif.
 */

export const POSTER_TRAME_DOT_SIZE_PX = 7;
export const POSTER_TRAME_MAX_DEVICE_PIXEL_RATIO = 1.5;

/* Le bord haut de la bande franchit le bas du viewport après 10 % d'un
 * écran de scroll : le geste s'installe d'abord, puis les premiers points
 * deviennent perceptibles vers 13-15 %. */
const BAND_APPEAR_SCROLL_RATIO = 0.1;

/* Amplitude maximale de la houle en uv, miroir des coefficients wobble du
 * shader (0.5 * 0.055 + 0.5 * 0.02). */
const WOBBLE_MAX_UV = 0.0375;

/* Marge conservée entre la crête la plus haute de la houle et le bas du
 * titre une fois la remontée terminée : la vague vient lécher le titre
 * sans jamais le toucher. L'amplitude de houle étant proportionnelle à la
 * hauteur du canvas, la garde se dérive de la même quantité dans resize()
 * (WOBBLE_MAX_UV * hauteur + cette réserve), sinon un grand viewport la
 * ferait déborder. */
const TITLE_CLEARANCE_EXTRA_PX = 16;

/* Hauteur de la rampe de dissolution, des premières pointes à l'aplat
 * plein : la vague occupe presque la moitié basse du viewport pendant la
 * traversée, son aplat colle au titre de la section suivante qui entre
 * pendant que ses pointes montent vers le titre du hero. */
export const POSTER_TRAME_BAND_RAMP_VIEWPORT_RATIO = 0.45;

/* Marge ajoutée sous la rampe pour poser le clip de l'affiche : l'amplitude
 * crête à creux de la houle en uv (somme des coefficients wobble du shader,
 * 0.055 + 0.02 = 0.075, soit le double du strict nécessaire) plus une
 * réserve d'antialiasing. Le clip doit toujours tomber sous des points
 * entièrement fusionnés, sinon un liseré de l'affiche transparaît le long
 * de son bord. */
const CLIP_MARGIN_EXTRA_UV = 0.078;

/* Zoom de l'affiche en fin de course sticky : la caméra s'approche
 * doucement du centre du visuel pendant que le contenu s'en détache. */
const DOLLY_MAX_SCALE = 1.2;

/* Le masque reste entièrement transparent dans la navbar, puis retrouve son
 * opacité sur une courte bande placée juste dessous. Aucun glyphe ne peut
 * ainsi croiser la navigation, sans faire disparaître le titre trop tôt. */
const TITLE_FADE_SAFE_GAP_PX = 2;
const TITLE_FADE_BAND_PX = 44;

/* Le titre remonte à 70 % de la vitesse du document jusqu'au rendez-vous de
 * la bande, puis retrouve la vitesse normale. Cette légère retenue prolonge
 * la lecture sans immobiliser le titre ni modifier la trajectoire du shader. */
const TITLE_SCROLL_RATE = 0.7;

/* Croissance de la portée de l'ombre pendant le scroll : le scrim, ancré au
 * bas de l'affiche, s'étire vers le haut (scaleY d'origine bottom) pour que
 * sa pénombre suive le titre qui monte. L'ombre ne se déplace jamais, seule
 * sa portée grandit : la cohérence d'éclairage de scène est préservée. En
 * racine carrée du progrès : la portée répond vite dès le début du geste,
 * là où le titre traverse les zones claires. */
const SCRIM_REACH_GROWTH = 1.1;

/* Fraction de la course sticky sur laquelle la bande effectue toute sa
 * remontée. Plus c'est court, plus l'overtake est rapide et sensible : la
 * bande rejoint le dessous du titre à 40 % de la course, s'y verrouille,
 * puis sort par le haut à la vitesse du contenu, avec lui. */
const BAND_ARRIVAL_PROGRESS = 0.4;

export const POSTER_TRAME_VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/*
 * Deux règles de survie GLSL, apprises du shader lamalama :
 * - highp obligatoire : en mediump (fp16 sur Apple Silicon), le hash du bruit
 *   dégénère et le rendu devient plat ou faux.
 * - smoothstep exige edge0 < edge1, sinon comportement indéfini : sur le
 *   backend Metal ça peut retourner 1.0 ou NaN partout (canvas tout crème).
 *   Toutes les rampes descendantes s'écrivent donc 1.0 - smoothstep(a, b, x).
 */
export const POSTER_TRAME_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_dot;
uniform float u_line;
uniform float u_ramp;
uniform float u_phase;
uniform float u_wobble_scale;
uniform vec3 u_cream;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1376))) * 43758.5443);
}

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return res * res;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_dot);
  vec2 local = fract(gl_FragCoord.xy / u_dot) - 0.5;
  float dist = length(local);

  /* Tout se décide au centre de la cellule : la taille d'un point est
   * constante sur toute sa surface, et varie doucement d'un point au suivant. */
  vec2 cuv = ((cell + 0.5) * u_dot) / u_resolution;

  /* Ondulation de la ligne de dissolution : plein de petites vagues serrées,
   * dont la phase n'avance qu'avec le scroll (u_phase dérive de scrollY).
   * À l'arrêt, la ligne est figée ; elle ondule pendant qu'on la traverse. */
  float w1 = noise(vec2(cuv.x * 7.0, u_phase));
  float w2 = noise(vec2(cuv.x * 16.0, u_phase * 1.7 + 5.0));
  float wobble = ((w1 - 0.5) * 0.055 + (w2 - 0.5) * 0.02) * u_wobble_scale;

  float line = u_line + wobble;

  /* Rampe de croissance haute (u_ramp, calée sur le viewport côté JS) : la
   * vague s'étale sur presque un demi-écran, les points grossissent
   * lentement. Le bas du canvas doit finir 100 % crème pour se raccorder à
   * la section suivante. */
  float cream_coverage = 1.0 - smoothstep(line - u_ramp, line + 0.03, cuv.y);
  float cream_radius = cream_coverage * 0.9;
  float cream_dot = 1.0 - smoothstep(cream_radius - 0.09, cream_radius, dist);

  gl_FragColor = vec4(u_cream * cream_dot, cream_dot);
}
`;

export function compilePosterTrameShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
  return shader;
}

export function initPosterTrame(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-poster-trame]');
  const hero = canvas?.closest<HTMLElement>('.hero-affiche');
  if (!canvas || !hero) return;

  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const titles = Array.from(hero.querySelectorAll<HTMLElement>('[data-hero-title]'));
  const counterweight = hero.querySelector<HTMLElement>('[data-hero-counterweight]');
  /* La préférence est relue à chaque frame plutôt que figée au chargement :
   * le document n'étant jamais rechargé, un lecteur qui active « Réduire les
   * animations » en cours de visite garderait sinon le dolly-in intact. */
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let titleSlowdownEndPx = document.documentElement.clientHeight * BAND_ARRIVAL_PROGRESS;

  const syncTitleScroll = (): number => {
    const activeTitle = titles.find((candidate) => candidate.offsetHeight > 0);
    const offsetPx = reducedMotionQuery.matches
      ? 0
      : Math.min(Math.max(0, window.scrollY), titleSlowdownEndPx) * (1 - TITLE_SCROLL_RATE);
    titles.forEach((title) => {
      title.style.translate = title === activeTitle && offsetPx > 0
        ? `0 ${offsetPx.toFixed(2)}px`
        : '';
    });
    if (counterweight) {
      counterweight.style.translate = counterweight.offsetHeight > 0 && offsetPx > 0
        ? `0 ${offsetPx.toFixed(2)}px`
        : '';
    }
    return offsetPx;
  };

  /* Le titre, les partenaires et le logo de la Région partagent la même
   * course. Chaque bloc se masque à sa propre rencontre avec le header. */
  const syncHeroCopy = (): void => {
    syncTitleScroll();

    const title = titles.find((candidate) => candidate.offsetHeight > 0);
    if (!title) return;

    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const syncCopyMask = (element: HTMLElement): number => {
      const elementTop = element.getBoundingClientRect().top;
      const distanceToHeader = elementTop - headerBottom;
      const presence = Math.min(
        1,
        Math.max(0, (distanceToHeader - TITLE_FADE_SAFE_GAP_PX) / TITLE_FADE_BAND_PX),
      );
      element.style.setProperty('--hero-title-presence', presence.toFixed(4));
      element.style.setProperty(
        '--hero-title-fade-depth',
        `${Math.max(0, headerBottom + TITLE_FADE_SAFE_GAP_PX + TITLE_FADE_BAND_PX - elementTop).toFixed(2)}px`,
      );
      return presence;
    };
    hero.style.setProperty('--hero-title-presence', syncCopyMask(title).toFixed(4));
    if (counterweight && counterweight.offsetHeight > 0) syncCopyMask(counterweight);
  };
  /* Constante de composition : posée une fois, jamais réécrite pendant le
   * scroll, chaque écriture invalidant le masque du titre. */
  titles.forEach((title) => {
    title.style.setProperty('--hero-title-fade-band', `${TITLE_FADE_BAND_PX.toFixed(2)}px`);
  });
  counterweight?.style.setProperty('--hero-title-fade-band', `${TITLE_FADE_BAND_PX.toFixed(2)}px`);
  syncHeroCopy();
  window.addEventListener('scroll', syncHeroCopy, { passive: true });
  window.addEventListener('resize', syncHeroCopy, { passive: true });

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return;

  const vertex = compilePosterTrameShader(gl, gl.VERTEX_SHADER, POSTER_TRAME_VERTEX_SHADER);
  const fragment = compilePosterTrameShader(gl, gl.FRAGMENT_SHADER, POSTER_TRAME_FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  /* Le dithering driver ajoute un bruit de plus ou moins 1 par canal : sur un
   * aplat qui doit se raccorder exactement au fond CSS, ça se voit. */
  gl.disable(gl.DITHER);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    dot: gl.getUniformLocation(program, 'u_dot'),
    line: gl.getUniformLocation(program, 'u_line'),
    ramp: gl.getUniformLocation(program, 'u_ramp'),
    phase: gl.getUniformLocation(program, 'u_phase'),
    wobbleScale: gl.getUniformLocation(program, 'u_wobble_scale'),
    cream: gl.getUniformLocation(program, 'u_cream'),
  };

  /* La dissolution rejoint la surface qui suit le hero. Le profil sombre
   * peut donc ouvrir sur la nuit sans produire un flash crème. */
  const rootStyles = getComputedStyle(document.documentElement);
  const transitionColor = rootStyles.getPropertyValue('--hero-transition-color').trim()
    || rootStyles.getPropertyValue('--color-brand-cream').trim();
  const creamHex = /^#[\da-f]{6}$/i.test(transitionColor) ? transitionColor.slice(1) : 'F9F4EC';
  const creamRgb = [0, 2, 4].map((offset) => Number.parseInt(creamHex.slice(offset, offset + 2), 16));
  gl.uniform3f(uniforms.cream, creamRgb[0] / 255, creamRgb[1] / 255, creamRgb[2] / 255);

  /* Si le contexte WebGL est perdu (pression GPU), la dissolution disparaît
   * simplement ; le scrim CSS, toujours actif, continue de porter l'ombre. */
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    canvas.style.display = 'none';
  });

  const backdrop = hero.querySelector<HTMLElement>('.hero-affiche__backdrop');
  const poster = hero.querySelector<HTMLElement>('.hero-affiche__poster');
  const posterLabel = hero.querySelector<HTMLElement>('[data-poster-label]');
  const scrim = hero.querySelector<HTMLElement>('.hero-affiche__scrim');

  let devicePixelRatio = 1;
  let arrivalScrollPx = 1;
  let canvasHeightPx = 1;
  let canvasBottomDocPx = 1;
  let lineStartDocPx = 0;
  let lineTravelPx = 0;
  let rampUv = 0.2;
  let releaseScrollPx = 1;
  let heroTopDocPx = 0;
  let heroBottomDocPx = 1;
  let backdropHeightPx = 1;
  let dollyOriginXPx = 0;
  let dollyOriginYPx = 0;
  let posterLabelLeftPx = 0;
  let posterLabelTopPx = 0;

  const resize = (): void => {
    devicePixelRatio = Math.min(window.devicePixelRatio || 1, POSTER_TRAME_MAX_DEVICE_PIXEL_RATIO);
    const { clientWidth, clientHeight } = canvas;
    canvas.width = Math.max(1, Math.round(clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(clientHeight * devicePixelRatio));
    gl.viewport(0, 0, canvas.width, canvas.height);

    /* Tout se mesure en coordonnées document : insensible à la position de
     * scroll au moment de la mesure. Deux hauteurs d'écran cohabitent et ne
     * se valent pas. documentElement.clientHeight est le GRAND viewport,
     * barre d'URL rétractée : c'est le bas d'écran que la bande doit
     * franchir. La scène épinglée, elle, est haute comme le backdrop : lui
     * seul dit où le sticky relâche l'affiche, donc où la course se termine.
     * window.innerHeight n'est jamais utilisé : il varie avec la barre
     * d'URL sans déclencher le moindre recalcul, toutes les mesures
     * seraient périmées. */
    const largeViewportHeightPx = document.documentElement.clientHeight;
    const rect = canvas.getBoundingClientRect();
    canvasHeightPx = Math.max(1, rect.height);
    canvasBottomDocPx = rect.top + window.scrollY + rect.height;
    backdropHeightPx = backdrop
      ? Math.max(1, backdrop.getBoundingClientRect().height)
      : largeViewportHeightPx;
    rampUv = (backdropHeightPx * POSTER_TRAME_BAND_RAMP_VIEWPORT_RATIO) / canvasHeightPx;

    /* Origine du dolly et position de l'étiquette : figées jusqu'au
     * prochain resize, la boucle de scroll n'a plus rien à relire. */
    if (backdrop) {
      dollyOriginXPx = backdrop.clientWidth * 0.5;
      dollyOriginYPx = backdrop.clientHeight * 0.38;
    }
    if (posterLabel) {
      posterLabelLeftPx = posterLabel.offsetLeft;
      posterLabelTopPx = posterLabel.offsetTop;
    }

    /* Course de scroll avant que le sticky ne relâche l'affiche : le dolly
     * s'étale dessus en entier, la remontée de la bande sur son début. */
    const heroRect = hero.getBoundingClientRect();
    const heroDocTop = heroRect.top + window.scrollY;
    heroTopDocPx = heroDocTop;
    heroBottomDocPx = heroDocTop + heroRect.height;
    releaseScrollPx = Math.max(1, heroDocTop + heroRect.height - backdropHeightPx);
    arrivalScrollPx = Math.max(1, releaseScrollPx * BAND_ARRIVAL_PROGRESS);
    titleSlowdownEndPx = arrivalScrollPx;
    const titleScrollOffsetPx = syncTitleScroll();

    /* Bas du titre en coordonnées document : la bande vient mourir juste
     * dessous, jamais dessus. Repli prudent si le titre est introuvable. */
    const titleRect = titles.find((candidate) => candidate.offsetHeight > 0)?.getBoundingClientRect();
    const titleBottomDoc = titleRect && titleRect.height > 0
      ? titleRect.bottom + window.scrollY - titleScrollOffsetPx
      : heroDocTop + largeViewportHeightPx * 0.85;

    /* Le HAUT de la bande (bord doux au-dessus de la ligne) obéit aux deux
     * rendez-vous de la chorégraphie ; on en déduit son point de départ et
     * la distance d'overtake, interpolée linéairement sur la fenêtre de
     * remontée. La garde sous le titre suit l'amplitude réelle de la houle
     * (proportionnelle à la hauteur du canvas) : invariante d'échelle. */
    const bandTipPx = 0.03 * canvasHeightPx;
    const titleClearancePx = WOBBLE_MAX_UV * canvasHeightPx + TITLE_CLEARANCE_EXTRA_PX;
    const appearScrollPx = largeViewportHeightPx * BAND_APPEAR_SCROLL_RATIO;
    const appearProgress = Math.min(0.95, appearScrollPx / arrivalScrollPx);
    const bandTopFinalDoc = titleBottomDoc + titleClearancePx;
    const bandTopAppearDoc = appearScrollPx + largeViewportHeightPx;
    const travel = Math.max(0, (bandTopAppearDoc - bandTopFinalDoc) / Math.max(0.05, 1 - appearProgress));
    lineStartDocPx = bandTopFinalDoc + travel + bandTipPx;
    lineTravelPx = travel;
    syncHeroCopy();
  };

  const render = (): void => {
    const progress = Math.min(1, Math.max(0, window.scrollY / arrivalScrollPx));
    const lineDoc = lineStartDocPx - progress * lineTravelPx;

    /* Dolly-in : zoom linéaire piloté par le scroll sur toute la course
     * sticky, une réponse directe au geste comme le reste de la scène.
     * Coupé en reduced-motion. */
    const courseProgress = Math.min(1, Math.max(0, window.scrollY / releaseScrollPx));
    if (!reducedMotionQuery.matches) {
      const dollyScale = 1 + (DOLLY_MAX_SCALE - 1) * courseProgress;
      if (poster) {
        poster.style.transform = `scale(${dollyScale.toFixed(4)})`;
      }
      if (posterLabel && backdrop) {
        const offsetX = (dollyScale - 1) * (posterLabelLeftPx - dollyOriginXPx);
        const offsetY = (dollyScale - 1) * (posterLabelTopPx - dollyOriginYPx);
        posterLabel.style.transform =
          `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px) scale(${dollyScale.toFixed(4)})`;
      }
    }

    /* Portée de l'ombre : actif aussi en reduced-motion, c'est du confort de
     * lecture indexé sur la position, pas un mouvement autonome. */
    if (scrim) {
      const reach = 1 + SCRIM_REACH_GROWTH * Math.sqrt(courseProgress);
      scrim.style.transform = `scaleY(${reach.toFixed(4)})`;
    }

    /* L'affiche épinglée est découpée par le bas, sous la bande de points :
     * derrière l'aplat crème du shader il n'y a plus que le fond CSS crème.
     * Peu importe la précision d'alpha du GPU, crème sur crème reste crème,
     * le raccord avec la section suivante est identique par construction. */
    if (backdrop) {
      const bandBottomViewport = lineDoc - window.scrollY + (rampUv + CLIP_MARGIN_EXTRA_UV) * canvasHeightPx;
      /* L'inset se mesure depuis le bas du backdrop, pas depuis le bas du
       * viewport visuel : les deux divergent sur mobile quand la barre
       * d'URL se rétracte, et la découpe déborderait au-dessus du front de
       * dissolution. Bas du backdrop reconstruit sans lecture de layout :
       * épinglé pendant la course sticky, puis il suit le contenu. */
      const backdropBottomViewport = Math.min(
        heroTopDocPx + backdropHeightPx,
        heroBottomDocPx - window.scrollY,
      );
      const clipBottom = Math.max(0, Math.round(backdropBottomViewport - bandBottomViewport));
      backdrop.style.clipPath = clipBottom > 0 ? `inset(0 0 ${clipBottom}px 0)` : '';
    }

    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.dot, POSTER_TRAME_DOT_SIZE_PX * devicePixelRatio);
    gl.uniform1f(uniforms.line, (canvasBottomDocPx - lineDoc) / canvasHeightPx);
    gl.uniform1f(uniforms.ramp, rampUv);
    gl.uniform1f(uniforms.phase, window.scrollY * 0.006);
    gl.uniform1f(uniforms.wobbleScale, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* Le rendu ne dépend que du scroll (la houle est indexée sur scrollY,
   * pas sur l'horloge) : redessiner à chaque frame saturait le GPU avec des
   * images identiques et affamait les autres animations de la page, qui
   * sautaient des frames de façon aléatoire. On ne redessine que quand la
   * position de scroll a changé, ou après un resize. */
  let renderedScrollY = -1;
  const renderNow = (): void => {
    renderedScrollY = window.scrollY;
    render();
  };

  resize();
  renderNow();
  /* Le titre est observé aussi : un swap de police tardif déplace son bas,
   * dont dépend le point d'arrivée de la bande. */
  const resizeObserver = new ResizeObserver(() => {
    resize();
    renderNow();
  });
  resizeObserver.observe(canvas);
  titles.forEach((title) => resizeObserver.observe(title));
  /* Le backdrop porte la hauteur de scène et l'origine du dolly, désormais
   * mises en cache : il doit prévenir quand elle change. */
  if (backdrop) resizeObserver.observe(backdrop);

  let isVisible = true;
  let isLoopRunning = false;
  let rafId = 0;
  const loop = (): void => {
    if (window.scrollY !== renderedScrollY) renderNow();
    rafId = requestAnimationFrame(loop);
  };

  /* Sans animation, le canevas reste sur sa composition initiale : la
   * boucle ne tourne pas du tout. */
  const startLoop = (): void => {
    if (isLoopRunning || !isVisible || reducedMotionQuery.matches) return;
    isLoopRunning = true;
    rafId = requestAnimationFrame(loop);
  };

  const stopLoop = (): void => {
    if (!isLoopRunning) return;
    isLoopRunning = false;
    cancelAnimationFrame(rafId);
  };

  startLoop();

  new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) startLoop();
    else stopLoop();
  }).observe(hero);

  reducedMotionQuery.addEventListener('change', () => {
    if (reducedMotionQuery.matches) {
      stopLoop();
      /* Les styles inline déjà posés survivraient à l'arrêt de la boucle :
       * l'affiche resterait zoomée et le titre décalé sur leur dernière
       * valeur. */
      if (poster) poster.style.transform = '';
      if (posterLabel) posterLabel.style.transform = '';
      syncTitleScroll();
      return;
    }

    /* Les mesures de course ont pu dériver pendant que la boucle dormait. */
    resize();
    renderNow();
    startLoop();
  });
}
