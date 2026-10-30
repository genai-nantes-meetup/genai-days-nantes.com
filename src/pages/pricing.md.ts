import type { APIRoute } from 'astro';
import { formatPriceAmount, formatPriceTaxNote, getPricingCopy, IS_WAITLIST_OPEN } from '../lib/pricing';
import { CTA_LINKS } from '../lib/cta-links';
import PRICING from '../content/pricing.json';

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = (site ?? new URL(url.origin)).href;

  const body = `# Pricing · GENAI DAYS

## ${getPricingCopy('en').name}

- Price: ${formatPriceAmount('en')} per person (${formatPriceTaxNote('en')})
- Capacity: ${PRICING.capacity} seats
- Availability: ${IS_WAITLIST_OPEN ? 'sold out, waitlist open' : 'on sale'}
- Tickets${IS_WAITLIST_OPEN ? ' (waitlist)' : ''}: ${CTA_LINKS.tickets}

For partnership or group pricing, contact the team via ${siteUrl}contact.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
