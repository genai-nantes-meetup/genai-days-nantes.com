import type { APIRoute } from 'astro';
import { formatPriceAmount } from '../lib/pricing';
import { CTA_LINKS } from '../lib/cta-links';
import PRICING from '../content/pricing.json';

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = (site ?? new URL(url.origin)).href;

  const body = `# Pricing · GENAI DAYS

## ${PRICING.name}

- Price: ${formatPriceAmount()} per person
- Capacity: ${PRICING.capacity} seats
- Tickets: ${CTA_LINKS.tickets}

For partnership or group pricing, contact the team via ${siteUrl}contact.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
