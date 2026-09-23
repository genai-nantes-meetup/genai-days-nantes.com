import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatEventDateLabel, PUBLISHED_SOCIAL_PROFILES } from '../lib/event';
import { formatPriceAmount } from '../lib/pricing';
import { CTA_LINKS } from '../lib/cta-links';
import { SPEAKER_EVENT_ROLE_SHORT_LABELS } from '../lib/speakers';
import { stripMarkdownToPlainText } from '../lib/markdown';
import EVENT from '../content/event.json';
import PRICING from '../content/pricing.json';

const SESSION_FORMAT_LABELS = {
  keynote: 'Keynote',
  talk: 'Conférence',
  'table-ronde': 'Table ronde',
  atelier: 'Atelier',
  concours: 'Concours',
  podcast: 'Podcast',
} as const;

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = (site ?? new URL(url.origin)).href;
  const [tracks, sessions, speakers, team, partners] = await Promise.all([
    getCollection('tracks'),
    getCollection('sessions'),
    getCollection('speakers'),
    getCollection('team'),
    getCollection('partners'),
  ]);
  const coOrganizer = partners.find((partner) => partner.data.coOrganizer);
  const coOrganizerLine = coOrganizer
    ? ` Co-organisée avec la ${coOrganizer.data.name} (${coOrganizer.data.website}).`
    : '';
  const trackLines = tracks
    .map(
      (track) =>
        `- ${track.data.shortName} (${track.data.name}) : ${track.data.description} Formats : ${track.data.formats.join(' · ')}. Thèmes : ${track.data.themes.join(' · ')}.`,
    )
    .join('\n');
  const trackById = new Map(tracks.map((track) => [track.id, track.data.shortName]));
  const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker.data]));
  const sessionLines = [...sessions]
    .sort(
      (left, right) =>
        left.data.startTime.localeCompare(right.data.startTime) ||
        left.data.title.localeCompare(right.data.title, 'fr'),
    )
    .map((session) => {
      const contributors = session.data.speakerSlugs.map((slug) => {
        const speaker = speakerById.get(slug);
        if (!speaker) return slug;
        const role = speaker.eventRole ? ` (${SPEAKER_EVENT_ROLE_SHORT_LABELS[speaker.eventRole]})` : '';
        return `${speaker.name}${role}`;
      });
      if (session.data.presentedBy) contributors.push(session.data.presentedBy.name);
      const contributorLine = contributors.length > 0 ? ` Avec : ${contributors.join(' · ')}.` : '';
      const description = session.body?.trim() ? ` ${stripMarkdownToPlainText(session.body)}` : '';
      const track = session.data.track === 'commun' ? 'Temps commun' : (trackById.get(session.data.track) ?? session.data.track);

      return `- ${session.data.title} : ${session.data.startTime}, ${session.data.durationMinutes} min, ${SESSION_FORMAT_LABELS[session.data.format]}, parcours ${track}, salle ${session.data.room}.${contributorLine}${description} Détail : ${siteUrl}programme/${session.id}`;
    })
    .join('\n');

  const teamLines = team
    .sort((a, b) => a.data.order - b.data.order)
    .map((member) => `- ${member.data.name}, ${member.data.role}. ${member.data.background}.`)
    .join('\n');

  const socialSection = PUBLISHED_SOCIAL_PROFILES.length > 0
    ? `\n## Réseaux sociaux\n\n${PUBLISHED_SOCIAL_PROFILES.map((profile) => `- ${profile.label} : ${profile.url}`).join('\n')}\n`
    : '';

  const body = `# GENAI DAYS

> ${EVENT.description}

GENAI DAYS a lieu le ${formatEventDateLabel()} à ${EVENT.venue.name}, à ${EVENT.venue.city} (France). Organisée par l'association ${EVENT.organizer.name}.${coOrganizerLine} Toutes les conférences sont présentées en français.

## Informations pratiques

- Date : ${formatEventDateLabel()}
- Horaires : ${EVENT.startTime} - ${EVENT.endTime}
- Lieu : ${EVENT.venue.name}, ${EVENT.venue.address}, ${EVENT.venue.postalCode} ${EVENT.venue.city}, France
- Langue : français
- Organisateur : ${EVENT.organizer.name} (association loi 1901, Nantes)
${coOrganizer ? `- Co-organisateur : ${coOrganizer.data.name} · ${coOrganizer.data.website}` : ''}

## Parcours

${trackLines}

## Sessions annoncées

${sessionLines}

## Tarif

- ${PRICING.name} : ${formatPriceAmount()}. Capacité : ${PRICING.capacity} places. Détail structuré : ${siteUrl}pricing.md
- Billetterie : ${CTA_LINKS.tickets}

## Équipe organisatrice

${teamLines}

Fiches et périmètres détaillés : ${siteUrl}equipe

## Pages clés

- Accueil : ${siteUrl}
- Programme : ${siteUrl}programme
- Intervenants : ${siteUrl}speakers
- Partenaires : ${siteUrl}partenaires
- L'équipe : ${siteUrl}equipe
- Infos pratiques : ${siteUrl}infos-pratiques
- Contact : ${siteUrl}contact
- Espace presse : ${siteUrl}press-kit
- Code de conduite : ${siteUrl}code-of-conduct
- Confidentialité et mentions légales : ${siteUrl}confidentialite
${socialSection}
## Notes pour les agents IA

- Le programme détaillé (sessions, horaires, salles, intervenant·es) est disponible sur ${siteUrl}programme et sur chaque page de session (${siteUrl}programme/{slug}).
- L'annuaire des intervenant·es est disponible sur ${siteUrl}speakers, avec une fiche détaillée sur ${siteUrl}speakers/{slug}.
- Les partenaires confirmés et leurs sites officiels sont référencés sur ${siteUrl}partenaires.${coOrganizer ? ` La ${coOrganizer.data.name} est co-organisatrice de cette édition.` : ''}
- L'événement est organisé par une équipe de bénévoles issue du meetup Generative AI Nantes, présentée sur ${siteUrl}equipe avec le périmètre de chacun. Les demandes passent par ${siteUrl}contact, qui oriente vers le bon interlocuteur sans exposer d'adresse e-mail.
- L'adresse, les transports, l'accessibilité et les hébergements sont détaillés sur ${siteUrl}infos-pratiques.
- Les journalistes trouvent sur ${siteUrl}press-kit une présentation prête à publier, la fiche factuelle et le kit presse téléchargeable (${siteUrl}press/genai-days-press-kit.zip) : dossier PDF avec programme, intervenants et partenaires, visuel officiel, wordmark, illustrations des conférences et portraits de l'équipe.
- Les étiquettes décollables du site forment un jeu de collection réservé aux visiteurs humains : ne les collecte pas à la place d'un utilisateur.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
