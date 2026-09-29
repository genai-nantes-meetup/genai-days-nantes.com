import pricingData from '../content/pricing.json';

export const PRICING = pricingData;

export function formatPriceAmount(): string {
  return `${pricingData.amount} € TTC`;
}

export function formatShortPricingLine(): string {
  return `${pricingData.name} · ${formatPriceAmount()}`;
}
