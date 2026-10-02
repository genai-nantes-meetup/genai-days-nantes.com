import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('downloadable press kit', () => {
  it('stays synchronized with its content, program, branding and builder', () => {
    const sources = [
      'scripts/build-press-kit.py',
      'src/content/event.json', 'src/content/pricing.json', 'src/content/press.json',
      'src/components/HeroAffiche.astro',
      'src/lib/programme.ts', 'src/lib/speakers.ts',
      'src/lib/cta-links.ts', 'src/styles/global.css',
      ...['tracks', 'sessions', 'speakers', 'partners', 'team'].flatMap((collection) =>
        readdirSync(`src/content/${collection}`)
          .filter((name) => name.endsWith('.md'))
          .map((name) => `src/content/${collection}/${name}`)),
    ];
    const current = Object.fromEntries(sources.sort().map((path) => [
      path, createHash('sha256').update(readFileSync(path)).digest('hex'),
    ]));
    const generated = JSON.parse(readFileSync('scripts/press-kit-manifest.json', 'utf8'));

    expect(generated, 'Regenerate the PDF and ZIP with scripts/build-press-kit.py when their sources change.').toEqual(current);
  });
});
