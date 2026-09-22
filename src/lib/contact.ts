export const CONTACT_TOPICS = [
  'general',
  'partner',
  'programme',
  'press',
  'privacy',
  'publication',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactProfile {
  contactLabel: string;
  environmentKey: string;
  image?: string;
  message: string;
  name: string;
  role: string;
  subject: string;
}

export const CONTACT_PROFILES: Record<ContactTopic, ContactProfile> = {
  general: {
    contactLabel: 'Adresse e-mail de l’équipe',
    environmentKey: 'CONTACT_GENERAL',
    message:
      'Bonjour,\n\nJe vous contacte au sujet de [votre question].\n\nVoici les éléments qui pourraient vous aider à me répondre : [précisions utiles].\n\nMerci et à bientôt,',
    name: 'L’équipe Naomakers',
    role: 'Organisation et accueil des participantes et participants',
    subject: 'Question sur l’événement du 17 novembre',
  },
  partner: {
    contactLabel: 'Adresse e-mail de Dorian',
    environmentKey: 'CONTACT_PARTNER',
    image: '/organisateurs/dorian-ouvrard-optimized.webp',
    message:
      'Bonjour Dorian,\n\nJe souhaiterais échanger avec toi au sujet d’un partenariat pour l’événement. Notre organisation est [présentation rapide] et nous aimerions contribuer autour de [idée ou format envisagé].\n\nSerais-tu disponible pour en parler ?\n\nÀ bientôt,',
    name: 'Dorian Ouvrard',
    role: 'Organisateur · partenariats et écosystème',
    subject: 'Proposition de partenariat',
  },
  programme: {
    contactLabel: 'Adresse e-mail de la programmation',
    environmentKey: 'CONTACT_PROGRAMME',
    message:
      'Bonjour,\n\nJe souhaite proposer un retour d’expérience autour de [sujet]. L’idée principale serait [résumé en une phrase], avec des enseignements concrets sur [points clés].\n\nJe serais ravi·e d’en discuter avec vous.\n\nÀ bientôt,',
    name: 'L’équipe programmation',
    role: 'Contenus, conférences et intervenantes et intervenants',
    subject: 'Proposition de conférence',
  },
  press: {
    contactLabel: 'Adresse e-mail d’Emilie',
    environmentKey: 'CONTACT_PRESS',
    image: '/organisateurs/emilie-blum-optimized.webp',
    message:
      'Bonjour Emilie,\n\nJe prépare un sujet sur [angle ou média] et j’aimerais échanger au sujet de l’événement. Ma demande concerne [interview, accréditation, visuel ou information].\n\nPeux-tu me rappeler ou me répondre avant [échéance] ?\n\nMerci,',
    name: 'Emilie Blum',
    role: 'Organisatrice · contact presse',
    subject: 'Demande presse',
  },
  privacy: {
    contactLabel: 'Adresse e-mail de Naomakers',
    environmentKey: 'CONTACT_PRIVACY',
    message:
      'Bonjour,\n\nJe souhaite exercer mon droit de [accès, rectification, effacement ou autre] concernant les données associées à [adresse e-mail ou précision utile].\n\nMerci de me confirmer la prise en compte de ma demande.\n\nCordialement,',
    name: 'L’équipe Naomakers',
    role: 'Données personnelles et demandes juridiques',
    subject: 'Demande concernant mes données personnelles',
  },
  publication: {
    contactLabel: 'Adresse e-mail de Rémi',
    environmentKey: 'CONTACT_PUBLICATION',
    image: '/organisateurs/remi-wetteren-optimized.webp',
    message:
      'Bonjour Rémi,\n\nJe te contacte au sujet de la publication du site. Ma demande concerne [objet de la demande] et voici les informations utiles : [précisions].\n\nMerci par avance pour ton retour.\n\nCordialement,',
    name: 'Rémi Wetteren',
    role: 'Responsable de la publication',
    subject: 'Question au responsable de la publication',
  },
};

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === 'string' && CONTACT_TOPICS.includes(value as ContactTopic);
}
