export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'tertiary';

/* Transitions limitées aux propriétés qui changent réellement (jamais
 * transition-all) : translate et box-shadow pour le recalage du primary,
 * background-color pour le secondary, scale pour le retour tactile. */
const BASE_CLASSES =
  'inline-flex items-center gap-2 font-sans font-bold uppercase text-sm tracking-wide transition-[translate,scale,box-shadow,background-color] duration-150 ease-out';

/*
 * Le primary reprend le langage print de la DA : angles droits et ombre
 * portée nuit, comme deux passages d'encre légèrement décalés.
 * Au hover, le bouton "se recale" sur son ombre.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-blue text-white border-2 border-brand-blue px-6 py-3 shadow-[0.3rem_0.3rem_0_0_var(--color-brand-night)] hover:translate-x-[0.15rem] hover:translate-y-[0.15rem] hover:shadow-[0.15rem_0.15rem_0_0_var(--color-brand-night)] active:scale-[0.96]',
  /* L'aplat orange assombri est réservé à la billetterie. Le mélange avec
   * l'encre nuit permet au libellé blanc de dépasser 4,5:1. */
  accent:
    'bg-[var(--color-action-ticket)] text-[var(--color-action-ticket-ink)] border-2 border-[var(--color-action-ticket)] px-6 py-3 shadow-[0.3rem_0.3rem_0_0_var(--color-brand-blue)] hover:border-[var(--color-action-ticket-hover)] hover:bg-[var(--color-action-ticket-hover)] hover:translate-x-[0.15rem] hover:translate-y-[0.15rem] hover:shadow-[0.15rem_0.15rem_0_0_var(--color-brand-blue)] active:scale-[0.96]',
  /* Les actions secondaires restent dans la famille bleue, sans reprendre
   * le signal orange propre à la réservation. */
  secondary:
    'bg-transparent text-brand-blue border-2 border-brand-blue hover:bg-brand-blue/5 px-6 py-3 active:scale-[0.96]',
  tertiary: 'bg-transparent text-brand-blue border-0 hover:underline px-0 py-0',
};

export function getButtonClasses(variant: ButtonVariant): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`;
}
