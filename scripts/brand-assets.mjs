import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// Reproduce the original editable buttersalt identity and raster exports.
const dependencyRoot = process.env.BRAND_DEPENDENCY_ROOT;
const require = createRequire(dependencyRoot ? path.join(dependencyRoot, 'package.json') : import.meta.url);
const sharp = require('sharp');
const root = process.cwd();
const output = path.join(root, 'public', 'brand');
await fs.mkdir(output, { recursive: true });
const palette = { ink: '#26251E', cream: '#FAF7EF', butter: '#F6CD45' };
const letters = [
  ['b', 'M30 25V109 M30 80C30 48 79 45 80 80C81 116 30 117 30 80'],
  ['u', 'M108 58V88C108 116 155 116 155 88V58'],
  ['t', 'M194 29V93Q194 115 216 107 M177 58H215'],
  ['t', 'M252 29V93Q252 115 274 107 M235 58H273'],
  ['e', 'M343 101C316 122 287 108 288 82C289 38 335 38 340 79H290'],
  ['r', 'M376 109V59 M376 79Q379 51 405 57'],
  ['s', 'M465 60C444 46 420 57 423 75C426 91 462 80 463 98C464 116 436 118 422 107'],
  ['a', 'M540 81C540 48 491 47 491 81C491 116 540 116 540 81 M540 59V110'],
  ['l', 'M576 25V95Q576 114 593 108'],
  ['t', 'M627 29V93Q627 115 649 107 M610 58H648'],
];
const wordmark = (color) => `<g fill="none" stroke="${color}" stroke-width="19" stroke-linecap="round" stroke-linejoin="round">${letters.map(([letter, d]) => `<path data-letter="${letter}" d="${d}"/>`).join('')}</g>`;
const mark = (color) => `<path fill="${color}" fill-rule="evenodd" d="M22 14Q22 6 30 6H34Q42 6 42 14V41C48 36 53 34 60 34C79 34 92 49 92 69C92 90 77 105 57 105C37 105 22 91 22 72ZM43 69C43 79 48 86 57 86C66 86 72 79 72 69C72 59 66 53 57 53C48 53 43 59 43 69ZM52 25C49 14 56 5 67 5C70 16 64 25 52 25Z"/>`;
const svg = (body, viewBox, title = 'buttersalt') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>${body}</svg>`;
const variants = [
  ['dark', palette.ink],
  ['light', palette.cream],
  ['mono', '#000000'],
];
for (const [name, color] of variants) {
  const word = svg(wordmark(color), '0 0 677 139');
  const seed = svg(mark(color), '0 0 114 114', 'buttersalt seed mark');
  await fs.writeFile(path.join(output, `wordmark-${name}.svg`), word);
  await fs.writeFile(path.join(output, `mark-${name}.svg`), seed);
  await sharp(Buffer.from(word)).resize(1354, 278).png().toFile(path.join(output, `wordmark-${name}.png`));
  await sharp(Buffer.from(seed)).resize(512, 512).png().toFile(path.join(output, `mark-${name}.png`));
}
const icon = svg(`<rect width="114" height="114" rx="27" fill="${palette.butter}"/>${mark(palette.ink)}`, '0 0 114 114', 'buttersalt');
await fs.writeFile(path.join(output, 'favicon.svg'), icon);
await sharp(Buffer.from(icon)).resize(32).png().toFile(path.join(output, 'favicon-32.png'));
const faviconPng = await sharp(Buffer.from(icon)).resize(32).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2); icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 32; icoHeader[7] = 32;
icoHeader.writeUInt16LE(1, 10); icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(faviconPng.length, 14); icoHeader.writeUInt32LE(22, 18);
await fs.writeFile(path.join(output, 'favicon.ico'), Buffer.concat([icoHeader, faviconPng]));
await sharp(Buffer.from(icon)).resize(192).png().toFile(path.join(output, 'icon-192.png'));
await sharp(Buffer.from(icon)).resize(512).png().toFile(path.join(output, 'icon-512.png'));
await sharp(Buffer.from(icon)).resize(180).png().toFile(path.join(output, 'apple-touch-icon.png'));
const social = svg(`<rect width="1200" height="630" fill="${palette.butter}"/><g transform="translate(90 70) scale(0.75)">${mark(palette.ink)}</g><g transform="translate(98 210) scale(1.48)">${wordmark(palette.ink)}</g><text x="105" y="502" font-family="Arial, sans-serif" font-size="27" fill="${palette.ink}" letter-spacing="4">A LITTLE CRUNCH. A LOT OF JOY.</text>`, '0 0 1200 630', 'buttersalt — a little crunch, a lot of joy');
await fs.writeFile(path.join(output, 'social-card.svg'), social);
await sharp(Buffer.from(social)).resize(1200, 630).png().toFile(path.join(output, 'social-card.png'));
const flavours = [
  ['original-butter-sea-salt', ['Original Butter', '& Sea Salt'], '#F6CD45'],
  ['sweet-salty', ['Sweet & Salty'], '#EAA7AB'],
  ['salted-caramel', ['Salted Caramel'], '#C75B2E'],
  ['cheddar-cheese', ['Cheddar Cheese'], '#3250B6'],
  ['chocolate-drizzle', ['Chocolate Drizzle'], '#752C3D'],
  ['chilli-lime', ['Chilli Lime'], '#667D43'],
  ['truffle-parmesan', ['Truffle Parmesan'], '#B5A4C8'],
  ['cinnamon-sugar', ['Cinnamon Sugar'], '#C47F74'],
];
const kernel = `<path d="M-18 6C-34 4-34-16-17-18C-15-35 8-39 16-23C35-26 44-7 31 6C41 27 20 37 8 26C-9 39-29 26-18 6Z"/>`;
for (const [slug, lines, color] of flavours) {
  const foreground = ['cheddar-cheese', 'chocolate-drizzle', 'chilli-lime'].includes(slug) ? palette.cream : palette.ink;
  const label = svg(`<rect width="300" height="400" rx="12" fill="${color}"/><g transform="translate(121 35) scale(.5)">${mark(foreground)}</g><g transform="translate(22 112) scale(.38)">${wordmark(foreground)}</g><text x="150" y="191" text-anchor="middle" font-family="DM Sans,Arial,sans-serif" font-size="11" letter-spacing="4" fill="${foreground}">POPCORN</text><g fill="none" stroke="${foreground}" stroke-width="1.2" opacity=".7"><g transform="translate(52 246) scale(.64)">${kernel}</g><g transform="translate(236 278) scale(.48)">${kernel}</g><g transform="translate(189 226) scale(.34)">${kernel}</g></g>${lines.map((line, i) => `<text x="150" y="${326 + i * 25}" text-anchor="middle" font-family="DM Sans,Arial,sans-serif" font-size="20" font-weight="600" fill="${foreground}">${line.replace(/&/g, '&amp;')}</text>`).join('')}`, '0 0 300 400', `${lines.join(' ')} packaging artwork — development concept`);
  await fs.writeFile(path.join(output, `packaging-${slug}.svg`), label);
  await sharp(Buffer.from(label)).resize(600, 800).png().toFile(path.join(output, `packaging-${slug}.png`));
}
console.log('Editable SVG masters, transparent PNG logos, icons and social assets exported.');
