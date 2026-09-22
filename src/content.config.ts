import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tracks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tracks' }),
  schema: z.object({
    name: z.string(),
    shortName: z.string(),
    accentColor: z.enum(['blue', 'orange']),
    description: z.string(),
    formats: z.array(z.string()).min(1),
    themes: z.array(z.string()).min(1),
  }),
});

const speakers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/speakers' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    company: z.string(),
    eventRole: z.enum(['jury', 'animateur']).optional(),
    bio: z.string(),
    profile: z.array(z.string()).min(2),
    genaiLegitimacy: z.string(),
    careerHighlights: z
      .array(
        z.object({
          period: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .min(2),
    companies: z
      .array(
        z.object({
          name: z.string(),
          relationship: z.string(),
          description: z.string(),
          website: z.string().url(),
          logo: z.string().optional(),
        }),
      )
      .min(1),
    photo: z.string().optional(),
    companyLogo: z.string().optional(),
    companyLogoAlt: z.string().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
    x: z.string().url().optional(),
  }),
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    title: z.string(),
    /* Certains titres (Keynote d'ouverture, Podcast MACI...) sont des libellés
     * de format plutôt qu'une citation à froid : ce flag permet de désactiver
     * les guillemets posés par défaut autour du titre. */
    quoteTitle: z.boolean().default(true),
    subtitle: z.string().optional(),
    seoTitle: z.string().optional(),
    track: z.enum(['decideurs', 'tech', 'commun']),
    startTime: z.string(),
    durationMinutes: z.number(),
    room: z.string(),
    speakerSlugs: z.array(z.string()),
    presentedBy: z
      .object({
        name: z.string(),
        website: z.string().url(),
        logo: z.string().optional(),
      })
      .optional(),
    format: z.enum(['keynote', 'talk', 'table-ronde', 'atelier', 'concours', 'podcast']),
    themes: z.array(z.string()).optional(),
    illustration: z
      .object({
        alt: z.string(),
        src: z.string().optional(),
        variant: z.enum(['governance', 'transformation', 'rag', 'agents', 'evaluation', 'sovereignty', 'opening', 'closing', 'podcast']),
        fit: z.enum(['cover', 'contain']).optional(),
      })
      .optional(),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    /* Le rôle porté sur l'événement, tel qu'il est annoncé aux partenaires. */
    role: z.string(),
    /* La fonction du quotidien, qui dit d'où vient la personne. */
    background: z.string(),
    photo: z.string(),
    photoWidth: z.number().int().positive(),
    photoHeight: z.number().int().positive(),
    linkedin: z.string().url().optional(),
    order: z.number().int().positive(),
  }),
});

const partners = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/partners' }),
  schema: z.object({
    name: z.string(),
    tier: z.enum(['silver', 'gold', 'platinum']),
    website: z.string().url(),
    logo: z.string(),
    logoWidth: z.number().int().positive(),
    logoHeight: z.number().int().positive(),
    monochromeLogo: z.string().optional(),
    monochromeLogoWidth: z.number().int().positive().optional(),
    monochromeLogoHeight: z.number().int().positive().optional(),
    coOrganizer: z.boolean().optional(),
    order: z.number().int().positive(),
    description: z.string().optional(),
  }),
});

export const collections = { tracks, speakers, sessions, partners, team };
