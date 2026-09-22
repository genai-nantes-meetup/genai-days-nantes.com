/**
 * Régénère les variantes responsives de l'affiche du hero depuis le master WebP.
 *
 * Usage : node scripts/generate-affiche.mjs [source] [dossier-de-sortie]
 */

import sharp from 'sharp';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const SOURCE = process.argv[2] ?? 'public/images/affiche-decide-implemente.webp';
const OUT_DIR = process.argv[3] ?? 'public/images';
const BASENAME = 'affiche-decide-implemente';
const WIDTHS = [1600, 800];

const image = sharp(SOURCE);
const { width } = await image.metadata();

if (!width || width < Math.max(...WIDTHS)) {
  throw new Error(`Le master doit mesurer au moins ${Math.max(...WIDTHS)} px de large.`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const w of WIDTHS) {
  const file = path.join(OUT_DIR, `${BASENAME}-${w}-optimized.webp`);
  await sharp(SOURCE)
    .resize({ width: w })
    .webp({ quality: 82 })
    .toFile(file);
  console.log(`✓ ${file}`);
}
