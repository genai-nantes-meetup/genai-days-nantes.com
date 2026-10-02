import eventData from '../content/event.json';
import { INTL_LOCALES, type Locale } from './i18n';

export const CONTACT_TOPICS = [
  'general',
  'partner',
  'programme',
  'press',
  'privacy',
  'publication',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

interface ContactProfileCopy {
  contactLabel: string;
  message: string;
  name: string;
  role: string;
  subject: string;
}

/* La coordonnée et le portrait ne changent pas avec la langue : seuls les
 * textes de la modale suivent celle de la page qui l'ouvre. */
export type ContactProfile = Record<Locale, ContactProfileCopy> & {
  environmentKey: string;
  image?: string;
};

/* L'objet cite le jour sans l'année. Il le lit dans event.json pour suivre
 * un changement de date. */
function formatEventDay(locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { day: 'numeric', month: 'long' }).format(
    new Date(`${eventData.date}T00:00:00`),
  );
}

export const CONTACT_PROFILES: Record<ContactTopic, ContactProfile> = {
  general: {
    environmentKey: 'CONTACT_GENERAL',
    fr: {
      contactLabel: 'Adresse e-mail de l’équipe',
      message:
        'Bonjour,\n\nJe vous contacte au sujet de [votre question].\n\nVoici les éléments qui pourraient vous aider à me répondre : [précisions utiles].\n\nMerci et à bientôt,',
      name: 'L’équipe Naomakers',
      role: 'Organisation et accueil des participantes et participants',
      subject: `Question sur l’événement du ${formatEventDay('fr')}`,
    },
    en: {
      contactLabel: 'Team email address',
      message:
        'Hello,\n\nI’m writing about [your question].\n\nSome details that may help: [useful details].\n\nThanks,',
      name: 'The Naomakers team',
      role: 'Event organization and attendee support',
      subject: `Question about the ${formatEventDay('en')} event`,
    },
  },
  partner: {
    environmentKey: 'CONTACT_PARTNER',
    image: '/organisateurs/dorian-ouvrard-optimized.webp',
    fr: {
      contactLabel: 'Adresse e-mail de Dorian',
      message:
        'Bonjour Dorian,\n\nJe souhaiterais échanger avec toi au sujet d’un partenariat pour l’événement. Notre organisation est [présentation rapide] et nous aimerions contribuer autour de [idée ou format envisagé].\n\nSerais-tu disponible pour en parler ?\n\nÀ bientôt,',
      name: 'Dorian Ouvrard',
      role: 'Organisateur · partenariats et écosystème',
      subject: 'Proposition de partenariat',
    },
    en: {
      contactLabel: 'Dorian’s email address',
      message:
        'Hi Dorian,\n\nI’d like to talk with you about a partnership for the event. Our organization is [quick introduction] and we’d like to contribute through [idea or format in mind].\n\nWould you be available to discuss it?\n\nTalk soon,',
      name: 'Dorian Ouvrard',
      role: 'Organizer · partnerships and ecosystem',
      subject: 'Partnership proposal',
    },
  },
  programme: {
    environmentKey: 'CONTACT_PROGRAMME',
    fr: {
      contactLabel: 'Adresse e-mail de la programmation',
      message:
        'Bonjour,\n\nJe souhaite proposer un retour d’expérience autour de [sujet]. L’idée principale serait [résumé en une phrase], avec des enseignements concrets sur [points clés].\n\nJe serais ravi·e d’en discuter avec vous.\n\nÀ bientôt,',
      name: 'L’équipe programmation',
      role: 'Contenus, conférences et intervenantes et intervenants',
      subject: 'Proposition de conférence',
    },
    en: {
      contactLabel: 'Program team email address',
      message:
        'Hello,\n\nI’d like to submit a talk on [topic], based on first-hand experience. The main idea would be [one-sentence summary], with concrete lessons on [key points].\n\nI’d be glad to discuss it with you.\n\nTalk soon,',
      name: 'The program team',
      role: 'Content, talks and speakers',
      subject: 'Talk proposal',
    },
  },
  press: {
    environmentKey: 'CONTACT_PRESS',
    image: '/organisateurs/emilie-blum-optimized.webp',
    fr: {
      contactLabel: 'Adresse e-mail d’Emilie',
      message:
        'Bonjour Emilie,\n\nJe prépare un sujet sur [angle ou média] et j’aimerais échanger au sujet de l’événement. Ma demande concerne [interview, accréditation, visuel ou information].\n\nPeux-tu me rappeler ou me répondre avant [échéance] ?\n\nMerci,',
      name: 'Emilie Blum',
      role: 'Organisatrice · contact presse',
      subject: 'Demande presse',
    },
    en: {
      contactLabel: 'Emilie’s email address',
      message:
        'Hi Emilie,\n\nI’m working on a story about [angle] for [media outlet] and would like to talk about the event. My request concerns [interview, accreditation, visual or information].\n\nCould you call or email me before [deadline]?\n\nThanks,',
      name: 'Emilie Blum',
      role: 'Organizer · press contact',
      subject: 'Press request',
    },
  },
  privacy: {
    environmentKey: 'CONTACT_PRIVACY',
    fr: {
      contactLabel: 'Adresse e-mail de Naomakers',
      message:
        'Bonjour,\n\nJe souhaite exercer mon droit de [accès, rectification, effacement ou autre] concernant les données associées à [adresse e-mail ou précision utile].\n\nMerci de me confirmer la prise en compte de ma demande.\n\nCordialement,',
      name: 'L’équipe Naomakers',
      role: 'Données personnelles et demandes juridiques',
      subject: 'Demande concernant mes données personnelles',
    },
    en: {
      contactLabel: 'Naomakers email address',
      message:
        'Hello,\n\nI’d like to exercise my right to [access, rectification, erasure or other] regarding the data associated with [email address or useful detail].\n\nPlease confirm that you have received my request.\n\nKind regards,',
      name: 'The Naomakers team',
      role: 'Personal data and legal requests',
      subject: 'Request about my personal data',
    },
  },
  publication: {
    environmentKey: 'CONTACT_PUBLICATION',
    image: '/organisateurs/remi-wetteren-optimized.webp',
    fr: {
      contactLabel: 'Adresse e-mail de Rémi',
      message:
        'Bonjour Rémi,\n\nJe te contacte au sujet de la publication du site. Ma demande concerne [objet de la demande] et voici les informations utiles : [précisions].\n\nMerci par avance pour ton retour.\n\nCordialement,',
      name: 'Rémi Wetteren',
      role: 'Responsable de la publication',
      subject: 'Question au responsable de la publication',
    },
    en: {
      contactLabel: 'Rémi’s email address',
      message:
        'Hi Rémi,\n\nI’m writing about the website’s content. My request concerns [subject of the request] and here is the relevant information: [details].\n\nThanks for your help.\n\nKind regards,',
      name: 'Rémi Wetteren',
      role: 'Publication director',
      subject: 'Question for the publication director',
    },
  },
};

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === 'string' && CONTACT_TOPICS.includes(value as ContactTopic);
}
