import pricingData from '../content/pricing.json';
import type { Locale } from './i18n';

export const PRICING = pricingData;

export function getPricingCopy(locale: Locale = 'fr'): { name: string; policy: string } {
  return locale === 'en' ? pricingData.en : { name: pricingData.name, policy: pricingData.policy };
}

export function formatPriceAmount(locale: Locale = 'fr'): string {
  return locale === 'en' ? `€${pricingData.amount}` : `${pricingData.amount} €`;
}

// The organizer is not subject to VAT: the displayed price is final.
export function formatPriceTaxNote(locale: Locale = 'fr'): string {
  return locale === 'en' ? 'VAT not applicable' : 'TVA non applicable';
}

export function formatShortPricingLine(locale: Locale = 'fr'): string {
  return `${getPricingCopy(locale).name} · ${formatPriceAmount(locale)} · ${formatPriceTaxNote(locale)}`;
}

/* « waitlist » : les 400 places sont parties. Les CTA de billetterie gardent
 * le même lien Billetweb, qui sert alors la liste d'attente, et le billet
 * reçoit son tampon. Repasser à « on-sale » si des places se libèrent. */
export type TicketAvailability = 'on-sale' | 'waitlist';

export const IS_WAITLIST_OPEN = (pricingData.availability as TicketAvailability) === 'waitlist';

const TICKET_CTA_COPY = {
  fr: {
    'on-sale': { compact: 'Réserver ma place', full: 'Réserver ma place' },
    waitlist: { compact: 'Liste d’attente', full: 'Rejoindre la liste d’attente' },
  },
  en: {
    'on-sale': { compact: 'Book my seat', full: 'Book my seat' },
    waitlist: { compact: 'Waitlist', full: 'Join the waitlist' },
  },
} as const;

/* `compact` pour le header et la barre mobile, `full` pour le hero et le billet. */
export function getTicketCtaCopy(locale: Locale = 'fr'): { compact: string; full: string } {
  return TICKET_CTA_COPY[locale][IS_WAITLIST_OPEN ? 'waitlist' : 'on-sale'];
}
