// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const eventData = JSON.parse(readFileSync(join(__dirname, 'src/content/event.json'), 'utf8'));

// https://astro.build/config
export default defineConfig({
  site: eventData.url,
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/stickers/'),
    }),
  ],
  adapter: vercel(),
  build: {
    // Every page's CSS ships inside its HTML instead of a separate render-blocking
    // <link rel="stylesheet"> request. Astro's default ('auto') only inlines bundles
    // under 4 KB; homepage component styles run 10-36 KB each, so in practice none of
    // them qualified and the mobile PageSpeed audit measured 450 ms lost to six blocking
    // stylesheet requests.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
