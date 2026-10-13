import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Pass the exact JSON evidence files to archive.');
const manifest = new Map((await readFile('docs/evidence/archive-manifest.json', 'utf8').then(JSON.parse).catch(() => [])).map((record) => [record.file, record]));
for (const file of files) {
  const original = createHash('sha256');
  await pipeline(createReadStream(file), original);
  const originalDigest = original.digest('hex');
  await pipeline(createReadStream(file), createGzip({ level: 6 }), createWriteStream(`${file}.gz`));
  const restored = createHash('sha256');
  await pipeline(createReadStream(`${file}.gz`), createGunzip(), restored);
  if (restored.digest('hex') !== originalDigest) throw new Error(`Archive verification failed: ${file}`);
  const record = { file, archive: `${file}.gz`, rawBytes: (await stat(file)).size, archiveBytes: (await stat(`${file}.gz`)).size, sha256: originalDigest };
  manifest.set(file, record);
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
await writeFile('docs/evidence/archive-manifest.json', `${JSON.stringify([...manifest.values()], null, 2)}\n`);
