#!/usr/bin/env node
/**
 * Turns the brand artwork into the logo and every icon the site needs.
 *
 *   npm run icons
 *
 * Source: public/images/TextileApp_logo_4K.webp (or public/logo-source.*)
 *
 * Two problems the source has, both handled here:
 *
 *  1. It is a tall portrait image with wide margins, so a favicon cut straight
 *     from it would be a sliver of oval adrift in whitespace. Everything is
 *     trimmed to the artwork and squared up first.
 *
 *  2. Its background is opaque white, not transparent. The footer sits on deep
 *     maroon and renders the mark inverted — which on a white-backed image
 *     would produce a white rectangle rather than a white emblem. So the
 *     background is keyed out: alpha is derived from how dark each pixel is,
 *     and the artwork is re-tinted to the brand maroon. That keeps the edges
 *     anti-aliased instead of jagged, and makes the mark safely invertible.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

const CANDIDATES = [
  'public/images/TextileApp_logo_4K.webp',
  'public/logo-source.png',
  'public/logo-source.webp',
  'public/logo-source.jpg',
];

const source = CANDIDATES.find((f) => existsSync(f));
if (!source) {
  console.error(`\n${RED('✗')} No source artwork found. Looked for:`);
  CANDIDATES.forEach((c) => console.error(DIM(`    ${c}`)));
  console.error('');
  process.exit(1);
}

/** Brand maroon — deep-maroon in the Tailwind palette. */
const MAROON = [74, 4, 4];
/** Page background, used behind icons so they never sit on a transparent hole. */
const CREAM = { r: 255, g: 248, b: 240, alpha: 1 };

const meta = await sharp(source).metadata();
console.log(`\n  source: ${source}  ${meta.width}x${meta.height}  ${meta.hasAlpha ? 'with alpha' : 'opaque'}\n`);

// ---------------------------------------------------------------- key out bg
// Alpha comes from luminance: white becomes fully transparent, the dark
// artwork fully opaque, and the pixels between keep their anti-aliasing.
const { data, info } = await sharp(source)
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = info.width * info.height;
const rgba = Buffer.alloc(px * 4);
for (let i = 0; i < px; i++) {
  const r = data[i * info.channels];
  const g = data[i * info.channels + 1];
  const b = data[i * info.channels + 2];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  rgba[i * 4] = MAROON[0];
  rgba[i * 4 + 1] = MAROON[1];
  rgba[i * 4 + 2] = MAROON[2];
  rgba[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(255 - luminance)));
}

const keyed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toBuffer();

// -------------------------------------------------------------- trim + square
const trimmed = await sharp(keyed).trim({ threshold: 6 }).toBuffer();
const t = await sharp(trimmed).metadata();

const side = Math.max(t.width, t.height);
const pad = Math.round(side * 0.06);
const squared = await sharp(trimmed)
  .extend({
    top: Math.floor((side - t.height) / 2) + pad,
    bottom: Math.ceil((side - t.height) / 2) + pad,
    left: Math.floor((side - t.width) / 2) + pad,
    right: Math.ceil((side - t.width) / 2) + pad,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

console.log(`  trimmed to ${t.width}x${t.height}, squared to ${side + pad * 2}px\n`);

// ------------------------------------------------------------------- outputs
mkdirSync('public', { recursive: true });

// The logo the site renders: transparent, so the footer can invert it.
await sharp(trimmed)
  .resize({ height: 512, withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile('public/logo.png');
const logoMeta = await sharp('public/logo.png').metadata();
console.log(`  ${GREEN('✓')} ${'public/logo.png'.padEnd(24)} ${logoMeta.width}x${logoMeta.height}  transparent`);

// Icons sit on cream so they read on any browser chrome, light or dark.
for (const [file, size] of [
  ['app/icon.png', 512],
  ['app/apple-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(squared)
    .resize(size, size, { fit: 'contain', background: CREAM })
    .flatten({ background: CREAM })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`  ${GREEN('✓')} ${file.padEnd(24)} ${size}x${size}`);
}

// -------------------------------------------------------- social share image
// 1200x630 is what WhatsApp, Facebook and X expect. Saree links get shared on
// WhatsApp constantly in this market, and without this they arrive as a bare
// grey rectangle with no branding at all.
const OG_W = 1200;
const OG_H = 630;

const emblem = await sharp(trimmed)
  .resize({ height: Math.round(OG_H * 0.6), withoutEnlargement: true })
  .toBuffer();

await sharp({ create: { width: OG_W, height: OG_H, channels: 4, background: CREAM } })
  .composite([{ input: emblem, gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toFile('app/opengraph-image.png');

console.log(`  ${GREEN('✓')} ${'app/opengraph-image.png'.padEnd(24)} ${OG_W}x${OG_H}`);

// -------------------------------------------------------------- invoice logo
// jsPDF cannot read the filesystem from inside a serverless function, so the
// emblem is baked into a module as base64. Kept small and cream-backed: it is
// embedded in every invoice PDF the store will ever issue.
const invoiceLogo = await sharp(squared)
  .resize(320, 320, { fit: 'contain', background: CREAM })
  .flatten({ background: CREAM })
  .png({ compressionLevel: 9 })
  .toBuffer();

fs.writeFileSync(
  'lib/logo-data.ts',
  [
    '// Generated by `npm run icons` — do not edit by hand.',
    '// Base64 emblem for invoice PDFs, where filesystem reads are unavailable.',
    "export const INVOICE_LOGO_PNG =",
    `  'data:image/png;base64,${invoiceLogo.toString('base64')}';`,
    '',
  ].join('\n'),
);

console.log(
  `  ${GREEN('✓')} ${'lib/logo-data.ts'.padEnd(24)} ${(invoiceLogo.length / 1024).toFixed(0)} KB embedded`,
);

console.log(DIM('\n  Next writes the favicon and share-image tags from the files in app/.\n'));
