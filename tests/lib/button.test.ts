import { describe, it, expect } from 'vitest';
import { getButtonClasses } from '../../src/lib/button';

describe('getButtonClasses', () => {
  it('primary is a solid blue fill with white text', () => {
    const classes = getButtonClasses('primary');
    expect(classes).toContain('bg-brand-blue');
    expect(classes).toContain('text-white');
  });

  it('secondary is a blue outline, never filled', () => {
    const classes = getButtonClasses('secondary');
    expect(classes).toContain('border-brand-blue');
    expect(classes).toContain('text-brand-blue');
    expect(classes).not.toContain('text-brand-orange');
    expect(classes).toContain('bg-transparent');
  });

  it('tertiary has no border or background', () => {
    const classes = getButtonClasses('tertiary');
    expect(classes).toContain('bg-transparent');
    expect(classes).toContain('border-0');
  });

  it.each(['primary', 'secondary', 'tertiary'] as const)(
    '%s uses bold uppercase text',
    (variant) => {
      const classes = getButtonClasses(variant);
      expect(classes).toContain('uppercase');
      expect(classes).toContain('font-bold');
    },
  );
});
