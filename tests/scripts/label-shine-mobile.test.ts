// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { initLabelShine } from '../../src/scripts/label-shine';

function stubMotionPreferences(mobile = false): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        mobile &&
        (query.includes('pointer: coarse') || query.includes('max-width: 39.999rem')),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function renderShineFixture(): {
  button: HTMLButtonElement;
  shine: HTMLElement;
  surface: HTMLElement;
} {
  document.body.innerHTML = `
    <div data-label-shine-surface>
      <div data-label-shine></div>
    </div>
    <aside data-label-archive>
      <button data-label-shine-permission hidden>Activer l'effet shiny</button>
    </aside>
  `;

  const button = document.querySelector<HTMLButtonElement>('[data-label-shine-permission]')!;
  const shine = document.querySelector<HTMLElement>('[data-label-shine]')!;
  const surface = document.querySelector<HTMLElement>('[data-label-shine-surface]')!;
  surface.getBoundingClientRect = () =>
    ({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  return { button, shine, surface };
}

afterEach(() => {
  document.body.innerHTML = '';
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('mobile metallic reflection activation', () => {
  it('shows an explicit sensor permission control on iOS', async () => {
    stubMotionPreferences();
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
    const { button } = renderShineFixture();
    const cleanup = initLabelShine();

    expect(button.hidden).toBe(false);
    expect(button.closest('[data-label-archive]')?.classList).toContain('is-shine-available');
    button.click();
    await vi.waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(button.hidden).toBe(true));
    expect(window.localStorage.getItem('genai-days:shiny-permission')).toBe('granted');

    cleanup();
  });

  it('restores the archive button when silent reactivation is no longer allowed', async () => {
    stubMotionPreferences(true);
    const requestPermission = vi.fn().mockRejectedValue(new DOMException('Interaction requise'));
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
    window.localStorage.setItem('genai-days:shiny-permission', 'granted');
    const { button } = renderShineFixture();
    const cleanup = initLabelShine();

    await vi.waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(button.hidden).toBe(false));
    expect(button.textContent).toBe("Activer l'effet shiny");
    expect(window.localStorage.getItem('genai-days:shiny-permission')).toBeNull();

    cleanup();
  });

  it('reactivates silently when the permission was previously granted', async () => {
    stubMotionPreferences(true);
    const requestPermission = vi.fn().mockResolvedValue('granted');
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
    window.localStorage.setItem('genai-days:shiny-permission', 'granted');
    const { button } = renderShineFixture();
    const cleanup = initLabelShine();

    await vi.waitFor(() => expect(requestPermission).toHaveBeenCalledOnce());
    expect(button.hidden).toBe(true);
    expect(button.closest('[data-label-archive]')?.classList).not.toContain('is-shine-available');

    cleanup();
  });

  it('moves the reflection on touch when motion sensors are unavailable', () => {
    stubMotionPreferences(true);
    vi.stubGlobal('DeviceOrientationEvent', undefined);
    const { shine, surface } = renderShineFixture();
    const cleanup = initLabelShine();

    surface.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 75,
        clientY: 25,
      }),
    );

    expect(shine.style.getPropertyValue('--label-shine-x')).toBe('66.00%');
    expect(shine.style.getPropertyValue('--label-shine-y')).toBe('32.50%');
    expect(Number(shine.style.getPropertyValue('--label-shine-opacity'))).toBeGreaterThan(0.45);

    cleanup();
  });
});
