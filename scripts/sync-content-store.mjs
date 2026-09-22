// Populates .astro/data-store.json (the *dev-mode* content layer cache) before
// tests run.
//
// Why this exists: `astro sync` / `astro build` always run content sync with
// command: "production", which persists collections to Astro's cacheDir
// (outside the project). But `astro/config`'s `getViteConfig`, which our
// Vitest config uses, always resolves routes/content with `dev: true`
// (see astro/dist/config/index.js), so `getCollection()` inside a Vitest test
// looks for the store at `.astro/data-store.json` (the dev path), which only
// `astro dev` normally writes. Running the full dev server just to warm a
// cache file is slow and flaky in CI, so this script calls Astro's internal
// `syncInternal` directly with command: "dev" to write that same file
// without starting a server.
//
// This relies on `astro`'s internal (non-public) sync API and is pinned to
// the exact `astro` version in package.json ("7.1.0", no caret). If that
// version is ever bumped, re-verify this script still works.
// astro's package.json "exports" map only allows importing "astro/config"
// etc., not arbitrary "astro/dist/..." subpaths, so these internals are
// loaded via resolved absolute file URLs instead of bare specifiers.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const astroRoot = dirname(require.resolve('astro/package.json'));
const importAstroInternal = (relativePath) =>
  import(pathToFileURL(join(astroRoot, relativePath)).href);

const { syncInternal } = await importAstroInternal('dist/core/sync/index.js');
const { resolveConfig } = await importAstroInternal('dist/core/config/config.js');
const { loadOrCreateNodeLogger } = await importAstroInternal('dist/core/logger/load.js');
const { createSettings } = await importAstroInternal('dist/core/config/settings.js');
const { runHookConfigDone, runHookConfigSetup } = await importAstroInternal('dist/integrations/hooks.js');

const { astroConfig } = await resolveConfig({}, 'dev');
const logger = await loadOrCreateNodeLogger(astroConfig, {});
let settings = await createSettings(astroConfig, undefined, undefined);
settings = await runHookConfigSetup({ command: 'dev', settings, logger });
await runHookConfigDone({ settings, logger });

await syncInternal({
  settings,
  logger,
  mode: 'development',
  command: 'dev',
  // Revalidate entries when a collection schema gains optional fields.
  force: true,
});

console.log('Content store synced to .astro/data-store.json');
