/**
 * Génère des variantes responsives `{basename}-{width}-optimized.webp` d'une image source,
 * pour alimenter un `srcset`. Ne touche jamais le fichier source.
 *
 * Usage : node scripts/generate-responsive-image.mjs <source> <outDir> <basename> <widths> [quality]
 *   widths : largeurs séparées par des virgules, ex. "640,1024,1920"
 *   quality : 1-100, défaut 85
 */

import sharp from 'sharp';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const [, , source, outDir, basename, widthsArg, qualityArg] = process.argv;

if (!source || !outDir || !basename || !widthsArg) {
  throw new Error('Usage: node scripts/generate-responsive-image.mjs <source> <outDir> <basename> <widths> [quality]');
}

const widths = widthsArg.split(',').map(Number);
const quality = qualityArg ? Number(qualityArg) : 85;

const image = sharp(source);
const { width: sourceWidth } = await image.metadata();

if (!sourceWidth || sourceWidth < Math.max(...widths)) {
  throw new Error(`La source (${sourceWidth}px) doit mesurer au moins ${Math.max(...widths)} px de large.`);
}

await mkdir(outDir, { recursive: true });

for (const w of widths) {
  const file = path.join(outDir, `${basename}-${w}-optimized.webp`);
  await sharp(source)
    .resize({ width: w })
    .webp({ quality })
    .toFile(file);
  console.log(`✓ ${file}`);
}
