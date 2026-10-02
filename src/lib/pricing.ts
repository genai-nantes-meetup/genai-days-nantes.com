import pricingData from '../content/pricing.json';
import type { Locale } from './i18n';

export const PRICING = pricingData;

export function getPricingCopy(locale: Locale = 'fr'): { name: string; policy: string } {
  return locale === 'en' ? pricingData.en : { name: pricingData.name, policy: pricingData.policy };
}

export function formatPriceAmount(locale: Locale = 'fr'): string {
  return locale === 'en' ? `€${pricingData.amount} incl. VAT` : `${pricingData.amount} € TTC`;
}

export function formatShortPricingLine(locale: Locale = 'fr'): string {
  return `${getPricingCopy(locale).name} · ${formatPriceAmount(locale)}`;
}
