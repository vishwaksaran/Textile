#!/usr/bin/env node
/**
 * Turns the brand logo into every icon the site needs.
 *
 *   npm run icons
 *
 * Source: public/logo.png  (maroon artwork on a white or transparent field)
 *
 * The source is a tall portrait image with generous margins, so a favicon cut
 * straight from it would be a sliver of oval lost in whitespace. Each icon is
 * therefore trimmed to the artwork, padded back out to a square, and only then
 * resized — so the emblem fills the tab icon rather than floating in it.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const SOURCE = 'public/logo.png';

if (!existsSync(SOURCE)) {
  console.error(`\n${RED('✗')} ${SOURCE} not found.`);
  console.error(DIM('  Save the logo there first, then run this again.\n'));
  process.exit(1);
}

/** Cream, so icons sit on brand colour rather than a transparent hole. */
const CREAM = { r: 255, g: 248, b: 240, alpha: 1 };

const OUTPUTS = [
  // Next reads these two filenames and writes the <link> tags itself.
  { file: 'app/icon.png', size: 512, background: CREAM },
  { file: 'app/apple-icon.png', size: 180, background: CREAM },
  // Referenced by the web manifest for installed/Android home screens.
  { file: 'public/icon-192.png', size: 192, background: CREAM },
  { file: 'public/icon-512.png', size: 512, background: CREAM },
];

const base = sharp(SOURCE);
const meta = await base.metadata();
console.log(`\n  source: ${SOURCE}  ${meta.width}x${meta.height}\n`);

// Trim the flat border away, then square it up around the artwork.
const trimmed = await sharp(SOURCE)
  .flatten({ background: CREAM })
  .trim({ threshold: 12 })
  .toBuffer();

const t = await sharp(trimmed).metadata();
const side = Math.max(t.width, t.height);
const pad = Math.round(side * 0.08); // breathing room, or it looks cramped
const square = await sharp(trimmed)
  .extend({
    top: Math.floor((side - t.height) / 2) + pad,
    bottom: Math.ceil((side - t.height) / 2) + pad,
    left: Math.floor((side - t.width) / 2) + pad,
    right: Math.ceil((side - t.width) / 2) + pad,
    background: CREAM,
  })
  .toBuffer();

console.log(`  trimmed to ${t.width}x${t.height}, squared to ${side + pad * 2}px\n`);

for (const { file, size, background } of OUTPUTS) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(square)
    .resize(size, size, { fit: 'contain', background })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`  ${GREEN('✓')} ${file.padEnd(24)} ${size}x${size}`);
}

console.log(DIM('\n  Next generates the favicon tags from app/icon.png and app/apple-icon.png.\n'));
