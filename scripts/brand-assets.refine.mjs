import fs from 'node:fs/promises';
import path from 'node:path';
const records = JSON.parse(await fs.readFile('scripts/brand-assets.refinements.json', 'utf8'));
for (const record of records) {
  if (!path.resolve(record.selectedOriginal).startsWith(path.resolve('assets/originals') + path.sep)) throw new Error('Asset output must stay in originals.');
  try { await fs.access(record.beforeOriginal); }
  catch { await fs.copyFile('assets/originals/' + record.slug + '-bag.png', record.beforeOriginal); }
  try { await fs.access(record.selectedOriginal); }
  catch { await fs.copyFile(record.source, record.selectedOriginal); }
}
console.log('Preserved eight pre-refinement originals and selected approved-identity concepts.');
