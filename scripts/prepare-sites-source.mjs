import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// The canonical GitHub history includes large original photographs and raw QA
// archives. Sites receives a separate source checkout with identical runtime
// inputs and the tested export, without importing those archival Git objects.
const root = await fs.realpath(process.cwd());
const target = path.resolve(root, '.sites-deploy');
if (!target.startsWith(root + path.sep)) throw new Error('Deployment checkout must stay inside the project.');
try {
  if ((await fs.readdir(target)).length) throw new Error('Preserve the existing deployment checkout; update it through the Sites source workflow instead of replacing its history.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const paths = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of paths) {
  if (file.startsWith('assets/originals/') || file.startsWith('docs/evidence/')) continue;
  const source = path.resolve(root, file);
  const destination = path.resolve(target, file);
  if (!source.startsWith(root + path.sep) || !destination.startsWith(target + path.sep)) throw new Error('Source path escaped checkout.');
  if ((await fs.stat(source)).size > 5 * 1024 * 1024) throw new Error(`Large runtime source requires review: ${file}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}
await fs.cp(path.join(root, 'out'), path.join(target, 'out'), { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await fs.writeFile(path.join(target, 'CANONICAL-SOURCE.md'), `# Canonical source\n\nFull source, original imagery and raw QA evidence: https://github.com/C0D312/buttersalt/tree/${commit}\n\nThis deployment checkout retains the same application source and the tested static export. Large archival material is retained in the canonical repository and local workspace.\n`);
console.log(target);
