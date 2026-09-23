import { getCollection } from 'astro:content';
import eventData from '../content/event.json';
import PRICING from '../content/pricing.json';

export const EVENT = eventData;
export const EVENT_URL = eventData.url;
export const EVENT_YEAR = eventData.year;

export const SOCIAL_PROFILES = [
  { network: 'linkedin', label: 'LinkedIn', url: eventData.social.linkedin },
  { network: 'x', label: 'X', url: eventData.social.x },
] as const;

/* Un profil sans URL reste affiché dans le footer pour caler le rendu, mais
 * ne doit jamais être déclaré aux moteurs ni aux agents IA. */
export const PUBLISHED_SOCIAL_PROFILES = SOCIAL_PROFILES.filter((profile) => profile.url !== '');

export function toISODateTime(time: string): string {
  return `${eventData.date}T${time}:00${eventData.timezone}`;
}

export function formatEventDateLabel(): string {
  const date = new Date(`${eventData.date}T00:00:00`);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatEventDateShort(): string {
  const [year, month, day] = eventData.date.split('-');
  return `${day}.${month}.${year}`;
}

export function formatEventDateCompact(): string {
  const [year, month, day] = eventData.date.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

export function formatEventDateUppercase(): string {
  return formatEventDateLabel().toUpperCase();
}

export async function buildEventJsonLd(siteUrl: string, ticketUrl: string) {
  const ticketHostname = new URL(ticketUrl).hostname;
  const hasPublicTicketUrl = ticketHostname !== 'example.com' && !ticketHostname.endsWith('.example.com');
  const coOrganizer = (await getCollection('partners')).find((partner) => partner.data.coOrganizer);
  const organizer = coOrganizer
    ? [
        { '@type': 'Organization', '@id': `${siteUrl}#organizer`, name: eventData.organizer.name, url: siteUrl },
        { '@type': 'Organization', name: coOrganizer.data.name, url: coOrganizer.data.website },
      ]
    : { '@type': 'Organization', '@id': `${siteUrl}#organizer`, name: eventData.organizer.name, url: siteUrl };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${siteUrl}#event`,
    name: eventData.name,
    description: eventData.description,
    url: siteUrl,
    image: [`${siteUrl}${eventData.image}`],
    startDate: toISODateTime(eventData.startTime),
    endDate: toISODateTime(eventData.endTime),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    inLanguage: eventData.language,
    isAccessibleForFree: eventData.isAccessibleForFree,
    maximumAttendeeCapacity: PRICING.capacity,
    mainEntityOfPage: { '@type': 'WebPage', '@id': siteUrl },
    ...(PUBLISHED_SOCIAL_PROFILES.length > 0 && {
      sameAs: PUBLISHED_SOCIAL_PROFILES.map((profile) => profile.url),
    }),
    location: {
      '@type': 'Place',
      '@id': `${siteUrl}#venue`,
      name: eventData.venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: eventData.venue.address,
        postalCode: eventData.venue.postalCode,
        addressLocality: eventData.venue.city,
        addressCountry: eventData.venue.country,
      },
    },
    organizer,
    ...(hasPublicTicketUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: ticketUrl,
            price: PRICING.amount,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}
