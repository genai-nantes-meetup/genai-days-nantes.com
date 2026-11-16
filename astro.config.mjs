// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAlternatePaths } from './src/lib/i18n.ts';
import { getUnlistedSpeakerIds, isUnlistedSession } from './src/lib/listing.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventData = JSON.parse(readFileSync(join(__dirname, 'src/content/event.json'), 'utf8'));

/* Le sitemap ne voit pas les collections : il relit le frontmatter des sessions
 * pour écarter les pages des sessions de secours et de leurs seuls intervenants,
 * en français et en anglais. Les tableaux de slugs sont écrits en ligne, au
 * format JSON, dans tous les fichiers de session. */
const sessionsDirectory = join(__dirname, 'src/content/sessions');
const sessionFrontmatters = readdirSync(sessionsDirectory)
  .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
  .map((name) => {
    const frontmatter = readFileSync(join(sessionsDirectory, name), 'utf8').split('---')[1];
    const slugsOf = (/** @type {string} */ field) => {
      const match = frontmatter.match(new RegExp(`^${field}:\\s*(\\[.*\\])\\s*$`, 'm'));
      if (match) return JSON.parse(match[1]);
      if (new RegExp(`^${field}:`, 'm').test(frontmatter)) throw new Error(`${name} : ${field} doit tenir sur une ligne.`);
      return [];
    };
    return {
      id: name.replace(/\.md$/, ''),
      data: {
        unlisted: /^unlisted:\s*true\s*$/m.test(frontmatter),
        speakerSlugs: slugsOf('speakerSlugs'),
        guestSlugs: slugsOf('guestSlugs'),
      },
    };
  });
const unlistedPaths = new Set(
  [
    ...sessionFrontmatters.filter(isUnlistedSession).map((session) => `/programme/${session.id}`),
    ...[...getUnlistedSpeakerIds(sessionFrontmatters)].map((id) => `/speakers/${id}`),
  ].flatMap((path) => Object.values(getAlternatePaths(path) ?? { fr: path })),
);

// https://astro.build/config
export default defineConfig({
  site: eventData.url,
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        return !/^(\/en)?\/stickers\//.test(pathname) && !unlistedPaths.has(pathname);
      },
      /* Chaque URL déclare ses deux versions et le français par défaut,
       * comme les <link rel="alternate" hreflang> du layout. */
      serialize(item) {
        const alternates = getAlternatePaths(new URL(item.url).pathname);
        if (!alternates) return item;
        const toUrl = (/** @type {string} */ path) => new URL(path, eventData.url).href;
        return {
          ...item,
          links: [
            { lang: 'fr', url: toUrl(alternates.fr) },
            { lang: 'en', url: toUrl(alternates.en) },
            { lang: 'x-default', url: toUrl(alternates.fr) },
          ],
        };
      },
    }),
  ],
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
