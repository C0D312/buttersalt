import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(process.env.BRAND_DEPENDENCY_ROOT ? path.join(process.env.BRAND_DEPENDENCY_ROOT, 'package.json') : import.meta.url);
const sharp = require('sharp');
const sources = JSON.parse(await fs.readFile('scripts/brand-assets.sources.json', 'utf8'));
await fs.mkdir('assets/originals', { recursive: true });
await fs.mkdir('public/images', { recursive: true });
for (const { slug, type, source } of sources) {
  const name = slug + '-' + type;
  const original = 'assets/originals/' + name + '.png';
  if (path.resolve(source) !== path.resolve(original)) await fs.copyFile(source, original);
  await sharp(source).rotate().resize(960, 960, { fit: 'cover' }).webp({ quality: 86, effort: 5 }).toFile('public/images/' + name + '.webp');
  await sharp(source).rotate().resize(480, 480, { fit: 'cover' }).webp({ quality: 82, effort: 5 }).toFile('public/images/' + name + '-480.webp');
}
const montage = await Promise.all(sources.map(async ({ slug, type }) => ({ input: await sharp('public/images/' + slug + '-' + type + '.webp').resize(320, 320).png().toBuffer(), left: (sources.findIndex(s => s.slug === slug && s.type === type) % 4) * 320, top: Math.floor(sources.findIndex(s => s.slug === slug && s.type === type) / 4) * 320 })));
await sharp({ create: { width: 1280, height: Math.ceil(sources.length / 4) * 320, channels: 4, background: '#FAF7EF' } }).composite(montage).png().toFile('public/brand/flavour-contact-sheet.png');
console.log('Exported ' + sources.length + ' photographic assets with retained originals.');
