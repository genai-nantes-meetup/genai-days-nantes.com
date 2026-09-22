interface ShinePosition {
  x: number;
  y: number;
  opacity: number;
}

interface ScreenTilt {
  horizontal: number;
  vertical: number;
}

interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const NEUTRAL_SHINE: ShinePosition = {
  x: 50,
  y: 42,
  opacity: 0.22,
};
const MAX_TILT = 20;
const SHINE_TRAVEL_X = 32;
const SHINE_TRAVEL_Y = 29;
const MOBILE_SHINE_BOOST = 1.6;
const MAX_RENDERED_OPACITY = 0.58;
const SHINE_PERMISSION_STORAGE_KEY = 'genai-days:shiny-permission';
const SHINE_PERMISSION_LABEL = "Activer l'effet shiny";

let activeCleanup: (() => void) | undefined;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getAngularDelta(value: number, origin: number): number {
  return ((value - origin + 540) % 360) - 180;
}

export function rotateTiltForScreen(
  betaDelta: number,
  gammaDelta: number,
  screenAngle: number,
): ScreenTilt {
  const angle = (screenAngle * Math.PI) / 180;

  return {
    horizontal: gammaDelta * Math.cos(angle) + betaDelta * Math.sin(angle),
    vertical: -gammaDelta * Math.sin(angle) + betaDelta * Math.cos(angle),
  };
}

export function getTiltShine(horizontalTilt: number, verticalTilt: number): ShinePosition {
  const horizontal = clamp(horizontalTilt / MAX_TILT, -1, 1);
  const vertical = clamp(verticalTilt / MAX_TILT, -1, 1);
  const movement = clamp(Math.hypot(horizontal, vertical), 0, 1);

  return {
    x: NEUTRAL_SHINE.x - horizontal * SHINE_TRAVEL_X,
    y: NEUTRAL_SHINE.y - vertical * SHINE_TRAVEL_Y,
    opacity: NEUTRAL_SHINE.opacity + movement * 0.14,
  };
}

export function getRenderedShine(position: ShinePosition, boostForMobile: boolean): ShinePosition {
  if (!boostForMobile) return position;

  return {
    ...position,
    opacity: clamp(position.opacity * MOBILE_SHINE_BOOST, 0, MAX_RENDERED_OPACITY),
  };
}

function getPointerShine(clientX: number, clientY: number, rect: DOMRect): ShinePosition {
  const x = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
  const y = clamp((clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
  const distanceFromCenter = clamp(Math.hypot(x - 0.5, y - 0.5) * 1.5, 0, 1);

  return {
    x: 18 + x * 64,
    y: 15 + y * 70,
    opacity: 0.23 + (1 - distanceFromCenter) * 0.13,
  };
}

function setShine(shine: HTMLElement, position: ShinePosition): void {
  shine.style.setProperty('--label-shine-x', `${position.x.toFixed(2)}%`);
  shine.style.setProperty('--label-shine-y', `${position.y.toFixed(2)}%`);
  shine.style.setProperty('--label-shine-opacity', position.opacity.toFixed(3));
}

function getScreenAngle(): number {
  const legacyWindow = window as Window & { orientation?: number };
  return window.screen.orientation?.angle ?? legacyWindow.orientation ?? 0;
}

function hasRememberedPermission(): boolean {
  try {
    return window.localStorage.getItem(SHINE_PERMISSION_STORAGE_KEY) === 'granted';
  } catch {
    return false;
  }
}

function rememberPermission(granted: boolean): void {
  try {
    if (granted) {
      window.localStorage.setItem(SHINE_PERMISSION_STORAGE_KEY, 'granted');
    } else {
      window.localStorage.removeItem(SHINE_PERMISSION_STORAGE_KEY);
    }
  } catch {
    // The browser permission remains authoritative when storage is unavailable.
  }
}

export function initLabelShine(root: ParentNode = document): () => void {
  activeCleanup?.();

  const shines = Array.from(root.querySelectorAll<HTMLElement>('[data-label-shine]'));
  const permissionButton = root.querySelector<HTMLButtonElement>('[data-label-shine-permission]');
  if (
    shines.length === 0 ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    activeCleanup = undefined;
    return () => {};
  }

  const cleanups: (() => void)[] = [];
  const boostForMobile = window.matchMedia(
    '(hover: none) and (pointer: coarse), (max-width: 39.999rem)',
  ).matches;
  const applyShine = (shine: HTMLElement, position: ShinePosition) => {
    setShine(shine, getRenderedShine(position, boostForMobile));
  };
  let sensorActive = false;
  let sensorConnected = false;
  let baselineBeta: number | undefined;
  let baselineGamma: number | undefined;
  let animationFrame = 0;
  let permissionFeedbackTimer = 0;
  let current = { ...NEUTRAL_SHINE };
  let target = { ...NEUTRAL_SHINE };
  const permissionArchive = permissionButton?.closest<HTMLElement>('[data-label-archive]');

  const setPermissionButtonAvailable = (available: boolean) => {
    if (!permissionButton) return;
    permissionButton.hidden = !available;
    permissionButton.disabled = false;
    permissionButton.textContent = SHINE_PERMISSION_LABEL;
    permissionArchive?.classList.toggle('is-shine-available', available);
  };

  const renderSensorShine = () => {
    current = {
      x: current.x + (target.x - current.x) * 0.14,
      y: current.y + (target.y - current.y) * 0.14,
      opacity: current.opacity + (target.opacity - current.opacity) * 0.12,
    };
    shines.forEach((shine) => applyShine(shine, current));

    const isSettled =
      Math.abs(target.x - current.x) < 0.04 &&
      Math.abs(target.y - current.y) < 0.04 &&
      Math.abs(target.opacity - current.opacity) < 0.002;

    animationFrame = isSettled ? 0 : window.requestAnimationFrame(renderSensorShine);
  };

  const scheduleSensorShine = () => {
    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(renderSensorShine);
    }
  };

  const resetBaseline = () => {
    baselineBeta = undefined;
    baselineGamma = undefined;
    target = { ...NEUTRAL_SHINE };
    scheduleSensorShine();
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;

    sensorActive = true;
    if (baselineBeta === undefined || baselineGamma === undefined) {
      baselineBeta = event.beta;
      baselineGamma = event.gamma;
      return;
    }

    const tilt = rotateTiltForScreen(
      getAngularDelta(event.beta, baselineBeta),
      getAngularDelta(event.gamma, baselineGamma),
      getScreenAngle(),
    );
    target = getTiltShine(tilt.horizontal, tilt.vertical);
    scheduleSensorShine();
  };

  const connectSensor = () => {
    if (sensorConnected) return;
    sensorConnected = true;
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    window.addEventListener('orientationchange', resetBaseline, { passive: true });
    window.screen.orientation?.addEventListener('change', resetBaseline);
    cleanups.push(() => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('orientationchange', resetBaseline);
      window.screen.orientation?.removeEventListener('change', resetBaseline);
    });
  };

  const orientationEvent = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & DeviceOrientationEventConstructorWithPermission)
    | undefined;

  if (orientationEvent?.requestPermission) {
    let permissionPending = false;
    const requestSensorPermission = async () => {
      if (permissionPending) return;
      const showFailureFeedback = Boolean(permissionButton && !permissionButton.hidden);
      permissionPending = true;
      if (permissionButton) {
        permissionButton.disabled = true;
        permissionButton.textContent = 'Activation des reflets';
      }

      try {
        if (await orientationEvent.requestPermission?.() === 'granted') {
          rememberPermission(true);
          connectSensor();
          setPermissionButtonAvailable(false);
          permissionPending = false;
          return;
        }
      } catch {
        sensorConnected = false;
      }

      rememberPermission(false);
      if (permissionButton) {
        if (showFailureFeedback) {
          permissionButton.textContent = 'Reflets non autorisés';
          permissionFeedbackTimer = window.setTimeout(() => {
            setPermissionButtonAvailable(true);
          }, 2400);
        } else {
          setPermissionButtonAvailable(true);
        }
      }
      permissionPending = false;
    };

    if (permissionButton) {
      permissionButton.addEventListener('click', requestSensorPermission);
      cleanups.push(() => permissionButton.removeEventListener('click', requestSensorPermission));
    }

    if (hasRememberedPermission()) {
      void requestSensorPermission();
    } else {
      setPermissionButtonAvailable(true);
    }
  } else if (orientationEvent) {
    setPermissionButtonAvailable(false);
    connectSensor();
  } else {
    setPermissionButtonAvailable(false);
  }

  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  shines.forEach((shine) => applyShine(shine, NEUTRAL_SHINE));
  shines.forEach((shine) => {
    const surface = shine.closest<HTMLElement>('[data-label-shine-surface]');
    if (!surface) return;

    let pointerEngaged = false;
    const updatePointerShine = (event: PointerEvent) => {
      if (sensorActive) return;
      applyShine(shine, getPointerShine(event.clientX, event.clientY, surface.getBoundingClientRect()));
    };
    const handlePointerDown = (event: PointerEvent) => {
      pointerEngaged = true;
      updatePointerShine(event);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (hasFinePointer || pointerEngaged) {
        updatePointerShine(event);
      }
    };
    const resetPointerShine = () => {
      pointerEngaged = false;
      if (!sensorActive) applyShine(shine, NEUTRAL_SHINE);
    };

    surface.addEventListener('pointerdown', handlePointerDown, { passive: true });
    surface.addEventListener('pointermove', handlePointerMove, { passive: true });
    surface.addEventListener('pointerup', resetPointerShine, { passive: true });
    surface.addEventListener('pointercancel', resetPointerShine, { passive: true });
    surface.addEventListener('pointerleave', resetPointerShine, { passive: true });
    cleanups.push(() => {
      surface.removeEventListener('pointerdown', handlePointerDown);
      surface.removeEventListener('pointermove', handlePointerMove);
      surface.removeEventListener('pointerup', resetPointerShine);
      surface.removeEventListener('pointercancel', resetPointerShine);
      surface.removeEventListener('pointerleave', resetPointerShine);
    });
  });

  const cleanup = () => {
    cleanups.forEach((removeListener) => removeListener());
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    if (permissionFeedbackTimer) window.clearTimeout(permissionFeedbackTimer);
    setPermissionButtonAvailable(false);
    shines.forEach((shine) => applyShine(shine, NEUTRAL_SHINE));
    if (activeCleanup === cleanup) activeCleanup = undefined;
  };

  activeCleanup = cleanup;
  return cleanup;
}
