// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initPressKitCopy } from '../../src/scripts/press-kit-copy';

describe('initPressKitCopy', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <p id="press-summary">Texte presse prêt à reprendre.</p>
      <button data-copy-target="press-summary" data-copy-label="Copier le texte">
        <svg aria-hidden="true"></svg>
        <span data-copy-action-label>Copier le texte</span>
      </button>
    `;

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('copies the requested content and confirms success', async () => {
    initPressKitCopy();
    const button = document.querySelector<HTMLButtonElement>('button')!;
    const label = button.querySelector<HTMLElement>('[data-copy-action-label]')!;
    button.click();
    await vi.waitFor(() => {
      expect(label.textContent).toBe('Copié');
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Texte presse prêt à reprendre.');
    expect(button.dataset.copyState).toBe('success');
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('ignores triggers whose target does not exist', async () => {
    document.body.innerHTML = '<button data-copy-target="missing">Copier</button>';
    expect(initPressKitCopy()).toBe(1);

    const button = document.querySelector<HTMLButtonElement>('button')!;
    button.click();
    await Promise.resolve();

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(button.textContent).toBe('Copier');
  });
});
