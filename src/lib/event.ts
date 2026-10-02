import { getCollection } from 'astro:content';
import eventData from '../content/event.json';
import PRICING from '../content/pricing.json';
import { INTL_LOCALES, type Locale } from './i18n';

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

/* Le texte éditorial de l'événement dans la langue de la page. La langue
 * de l'événement lui-même (EVENT.language) reste le français. */
export function getEventCopy(locale: Locale = 'fr'): { tagline: string; description: string } {
  return locale === 'en' ? eventData.en : { tagline: eventData.tagline, description: eventData.description };
}

export function toISODateTime(time: string): string {
  return `${eventData.date}T${time}:00${eventData.timezone}`;
}

export function formatEventDateLabel(locale: Locale = 'fr'): string {
  const date = new Date(`${eventData.date}T00:00:00`);
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
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

export function formatEventDateUppercase(locale: Locale = 'fr'): string {
  return formatEventDateLabel(locale).toLocaleUpperCase(INTL_LOCALES[locale]);
}

export async function buildEventJsonLd(siteUrl: string, ticketUrl: string, locale: Locale = 'fr') {
  const ticketHostname = new URL(ticketUrl).hostname;
  const hasPublicTicketUrl = ticketHostname !== 'example.com' && !ticketHostname.endsWith('.example.com');
  const supporter = (await getCollection('partners')).find((partner) => partner.data.coOrganizer);
  const organizer = { '@type': 'Organization', '@id': `${siteUrl}#organizer`, name: eventData.organizer.name, url: siteUrl };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${siteUrl}#event`,
    name: eventData.name,
    description: getEventCopy(locale).description,
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
    ...(supporter && {
      sponsor: { '@type': 'Organization', name: supporter.data.name, url: supporter.data.website },
    }),
    ...(hasPublicTicketUrl
      ? {
          offers: {
            '@type': 'Offer',
            url: ticketUrl,
            price: PRICING.amount,
            priceCurrency: 'EUR',
            priceSpecification: {
              '@type': 'PriceSpecification',
              price: PRICING.amount,
              priceCurrency: 'EUR',
              valueAddedTaxIncluded: true,
            },
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}
