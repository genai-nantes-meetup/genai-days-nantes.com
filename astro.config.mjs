// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAlternatePaths } from './src/lib/i18n.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventData = JSON.parse(readFileSync(join(__dirname, 'src/content/event.json'), 'utf8'));

// https://astro.build/config
export default defineConfig({
  site: eventData.url,
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !/^(\/en)?\/stickers\//.test(new URL(page).pathname),
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
