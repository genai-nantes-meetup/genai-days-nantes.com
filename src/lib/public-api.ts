import type { APIRoute } from 'astro';
import EVENT from '../content/event.json';
import { localizePath, type Locale } from './i18n';
import { getLocalizedCollection } from './localized-content';
import { stripMarkdownToPlainText } from './markdown';
import { SPEAKER_EVENT_ROLE_SHORT_LABELS } from './speakers';

/* Read-only JSON API over the content collections, prerendered at build time.
 * One path per language (/api/fr/sponsors.json, /api/en/sponsors.json). Every
 * URL in a payload is absolute so a consumer can follow it without knowing the
 * site origin. */
export const PUBLIC_API_RESOURCES = ['sponsors', 'speakers', 'sessions'] as const;
export type PublicApiResource = (typeof PUBLIC_API_RESOURCES)[number];

const API_PREFIX = '/api';

/* Platinum first: the order of the partner wall. */
const PARTNER_TIER_ORDER = ['platinum', 'gold', 'silver'] as const;

export function getPublicApiPath(resource: PublicApiResource, locale: Locale): string {
  return `${API_PREFIX}/${locale}/${resource}.json`;
}

type UrlBuilder = (path: string) => string;

function buildEventSummary(toAbsoluteUrl: UrlBuilder) {
  return {
    name: EVENT.name,
    date: EVENT.date,
    startTime: EVENT.startTime,
    endTime: EVENT.endTime,
    timezone: EVENT.timezone,
    venue: {
      name: EVENT.venue.name,
      address: EVENT.venue.address,
      postalCode: EVENT.venue.postalCode,
      city: EVENT.venue.city,
    },
    url: toAbsoluteUrl('/'),
  };
}

function withEnvelope<K extends PublicApiResource, T>(
  resource: K,
  locale: Locale,
  toAbsoluteUrl: UrlBuilder,
  items: T[],
) {
  return {
    locale,
    // Talks are delivered in French whatever the locale of the payload.
    talksLanguage: 'fr',
    event: buildEventSummary(toAbsoluteUrl),
    count: items.length,
    [resource]: items,
  };
}

async function buildSponsors(locale: Locale, toAbsoluteUrl: UrlBuilder) {
  const partners = await getLocalizedCollection('partners', locale);
  const sorted = [...partners].sort(
    (left, right) =>
      PARTNER_TIER_ORDER.indexOf(left.data.tier) - PARTNER_TIER_ORDER.indexOf(right.data.tier) ||
      left.data.order - right.data.order,
  );

  return withEnvelope(
    'sponsors',
    locale,
    toAbsoluteUrl,
    sorted.map((partner) => ({
      id: partner.id,
      name: partner.data.name,
      tier: partner.data.tier,
      coOrganizer: partner.data.coOrganizer ?? false,
      description: partner.data.description ?? null,
      website: partner.data.website,
      logo: toAbsoluteUrl(partner.data.logo),
      pageUrl: toAbsoluteUrl(localizePath('/partenaires', locale)),
    })),
  );
}

async function buildSpeakers(locale: Locale, toAbsoluteUrl: UrlBuilder) {
  const [speakers, sessions] = await Promise.all([
    getLocalizedCollection('speakers', locale),
    getLocalizedCollection('sessions', locale),
  ]);
  const sessionsBySpeaker = new Map<string, { id: string; title: string; url: string }[]>();
  for (const session of sessions) {
    for (const slug of session.data.speakerSlugs) {
      const list = sessionsBySpeaker.get(slug) ?? [];
      list.push({
        id: session.id,
        title: session.data.title,
        url: toAbsoluteUrl(localizePath(`/programme/${session.id}`, locale)),
      });
      sessionsBySpeaker.set(slug, list);
    }
  }
  const sorted = [...speakers].sort((left, right) => left.data.name.localeCompare(right.data.name, locale));

  return withEnvelope(
    'speakers',
    locale,
    toAbsoluteUrl,
    sorted.map((speaker) => ({
      id: speaker.id,
      name: speaker.data.name,
      role: speaker.data.role,
      company: speaker.data.company,
      eventRole: speaker.data.eventRole ? SPEAKER_EVENT_ROLE_SHORT_LABELS[locale][speaker.data.eventRole] : null,
      bio: speaker.data.bio,
      profile: speaker.data.profile ?? null,
      genaiLegitimacy: speaker.data.genaiLegitimacy ?? null,
      careerHighlights: speaker.data.careerHighlights ?? null,
      companies: (speaker.data.companies ?? []).map((company) => ({
        name: company.name,
        relationship: company.relationship,
        description: company.description,
        website: company.website,
      })),
      photo: speaker.data.photo ? toAbsoluteUrl(speaker.data.photo) : null,
      links: {
        linkedin: speaker.data.linkedin ?? null,
        website: speaker.data.website ?? null,
        x: speaker.data.x ?? null,
      },
      sessions: sessionsBySpeaker.get(speaker.id) ?? [],
      pageUrl: toAbsoluteUrl(localizePath(`/speakers/${speaker.id}`, locale)),
    })),
  );
}

async function buildSessions(locale: Locale, toAbsoluteUrl: UrlBuilder) {
  const [sessions, speakers, tracks] = await Promise.all([
    getLocalizedCollection('sessions', locale),
    getLocalizedCollection('speakers', locale),
    getLocalizedCollection('tracks', locale),
  ]);
  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker.data]));
  const trackById = new Map(tracks.map((track) => [track.id, track.data]));
  const sorted = [...sessions].sort(
    (left, right) =>
      left.data.startTime.localeCompare(right.data.startTime) ||
      left.data.title.localeCompare(right.data.title, locale),
  );

  return withEnvelope(
    'sessions',
    locale,
    toAbsoluteUrl,
    sorted.map((session) => {
      const track = trackById.get(session.data.track);
      return {
        id: session.id,
        title: session.data.title,
        subtitle: session.data.subtitle ?? null,
        description: session.body?.trim() ? stripMarkdownToPlainText(session.body) : null,
        format: session.data.format,
        track: session.data.track,
        trackName: track?.shortName ?? null,
        startTime: session.data.startTime,
        durationMinutes: session.data.durationMinutes,
        room: session.data.room || null,
        themes: session.data.themes ?? [],
        speakers: session.data.speakerSlugs.map((slug) => ({
          id: slug,
          name: speakerById.get(slug)?.name ?? slug,
          pageUrl: toAbsoluteUrl(localizePath(`/speakers/${slug}`, locale)),
        })),
        presentedBy: session.data.presentedBy
          ? { name: session.data.presentedBy.name, website: session.data.presentedBy.website }
          : null,
        image: session.data.illustration?.src ? toAbsoluteUrl(session.data.illustration.src) : null,
        pageUrl: toAbsoluteUrl(localizePath(`/programme/${session.id}`, locale)),
      };
    }),
  );
}

const BUILDERS = {
  sponsors: buildSponsors,
  speakers: buildSpeakers,
  sessions: buildSessions,
} satisfies Record<PublicApiResource, (locale: Locale, toAbsoluteUrl: UrlBuilder) => Promise<unknown>>;

export function createPublicApiRoute(resource: PublicApiResource, locale: Locale): APIRoute {
  return async ({ site, url }) => {
    const siteUrl = site ?? new URL(url.origin);
    const toAbsoluteUrl: UrlBuilder = (path) => new URL(path, siteUrl).href;
    const payload = await BUILDERS[resource](locale, toAbsoluteUrl);

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  };
}
