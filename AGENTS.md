## Writing style

Never use the em dash character ("—") anywhere in this codebase: page copy, component text, content collection files, code comments, commit messages. Use "·", ":", "," or separate sentences instead, matching whatever the surrounding site copy already uses for that kind of break.

French typography: when a body-copy sentence uses a ":" (or ";", "!", "?"), put a non-breaking space before it so the punctuation never wraps to its own line. In `.astro` template text, use the `&nbsp;` entity. In content collection frontmatter (`.md`) or any string rendered through a `{expression}`, insert an actual U+00A0 character instead: entities are not interpreted there and would render as literal text.

Brand typography: every visible occurrence of the event name must use the official `GENAI DAYS` wordmark treatment, uppercase Garamond roman with `GENAI` bold, `DAYS` regular, and only `AI` italic. Use `EventName.astro` for literal template copy and `BrandText.astro` for strings rendered through an expression.

## Testing

Don't add a unit test for every new content collection entry (speaker, session, partner, track, team member, etc.). Only the first entries of a given kind got dedicated tests as examples; adding one per new content item is not expected and adds maintenance overhead without real coverage value.

## Images

Every image must be optimized/compressed before it is referenced anywhere on the site (components, pages, content collections): never publish a reference to an unoptimized source file.

When optimizing/compressing an image (new or existing), never overwrite the original file. Keep the original filename untouched and add the optimized version alongside it with an `-optimized` suffix before the extension (e.g. `photo.jpg` + `photo-optimized.jpg`). Point performance-sensitive references (OG/Twitter meta tags, JSON-LD `image`, on-page thumbnails) at the `-optimized` file; keep references meant for full-quality downloads (press kit downloadable assets, etc.) on the original.

## Site configuration

Event and pricing data (date, venue, ticket pricing) live in `src/content/event.json` and `src/content/pricing.json`, consumed via `src/lib/event.ts` and `src/lib/pricing.ts`. Never hardcode the event date, year, or venue as a literal string in a page or component: use `EVENT`, `EVENT_YEAR`, `formatEventDateLabel()`, `formatEventDateShort()`, or `formatEventDateUppercase()` from `src/lib/event.ts` instead, so a date/venue change only requires editing the JSON file.

## SEO

Whenever you change a page's visible wording (title, headline, lede, key copy), also update that page's `<title>`, meta description, and any JSON-LD (`structuredData` prop) that restates the same information, so they stay consistent with what the page actually says.

## GEO / AI discoverability

`/llms.txt` is generated dynamically at `src/pages/llms.txt.ts` from `EVENT`, `CTA_LINKS`, `PRICING`, and the `tracks` collection, so links and data fields (date, venue, pricing, ticket URL, track descriptions) stay in sync automatically. The hand-written prose (intro paragraph, section headings, AI-agent notes) does not update itself: whenever site content changes in a way that could make that prose stale or add a new key page, update `src/pages/llms.txt.ts` in the same change, and periodically re-check `src/pages/llms.txt.ts` against the source code (pages, components, content collections), not the deployed website, for drift.

## Known gaps

Known issues recorded rather than fixed, so they are not rediscovered from scratch. Remove an entry when it is fixed.

- A second, undocumented palette (`#FAF8F3`, `#22357D`, `#FF4B2B`, `#0D0D12`) is still hardcoded in `src/components/SessionIllustration.astro`, `src/pages/confidentialite.astro` and `src/pages/stickers/*`, alongside the brand tokens of `src/styles/global.css`. It predates the current design system and drifts from it; `DESIGN.md` documents only the brand palette. `src/components/LabelArchive.astro` has already been moved onto the brand tokens and is no longer affected.
- « Ma journée » (adding programme sessions to a personal day) is disabled for visitors until it is stable enough: `IS_MY_DAY_ENABLED` in `src/lib/features.ts` is `false`, which hides the session toggles and skips `initMyDay`. The label collection stays active. Flip the flag to `true` to re-enable it; the test suite passes in both states.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
