import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const root = await fs.realpath(process.cwd());
const require = createRequire(import.meta.url);
const packageInfo = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
if (packageInfo.name !== 'buttersalt') throw new Error('Run this script from the buttersalt project root.');
const inside = (relative) => {
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) throw new Error('Build path must remain within the project workspace.');
  return resolved;
};
const api = inside('src/app/api');
const backup = inside('.build-api');
const sitemapSource = inside('src/app/sitemap.ts');
const sitemapBackup = inside('.build-api/.sitemap-previous.ts');
const nextOutput = inside('.next');
const nextBackup = inside('.build-api/.next-previous');
const exported = inside('out');
const exportBackup = inside('.build-api/.out-previous');
const exists = async (target) => { try { await fs.access(target); return true; } catch { return false; } };
if (await exists(backup)) throw new Error('A prior preview backup exists at .build-api. Restore it before building again; see docs/DEPLOYMENT.md.');
if (!(await exists(api))) throw new Error('Expected API source directory is missing. Inspect .build-api before continuing.');
await fs.rename(api, backup); // Atomic ownership of the temporary backup.
let movedNext = false;
let movedSitemap = false;
let movedExport = false;
let startedBuild = false;
let success = false;
try {
  // Next requires a statically forced metadata route for export, while the
  // selling application's sitemap must retain fresh provider data. The private
  // export has an empty sitemap and never fetches or indexes the catalogue.
  await fs.rename(sitemapSource, sitemapBackup); movedSitemap = true;
  if (await exists(nextOutput)) { await fs.rename(nextOutput, nextBackup); movedNext = true; }
  if (await exists(exported)) { await fs.rename(exported, exportBackup); movedExport = true; }
  const nextBin = require.resolve('next/dist/bin/next');
  startedBuild = true;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: root, stdio: 'inherit', windowsHide: true,
      env: {
        ...process.env, BUTTERSALT_STATIC: '1', NEXT_PUBLIC_STATIC_PREVIEW: 'true', COMMERCE_MODE: 'development',
        SHOPIFY_CHECKOUT_ENABLED: 'false', INDEXING_ENABLED: 'false',
        SHOPIFY_STORE_DOMAIN: '', SHOPIFY_STOREFRONT_PRIVATE_TOKEN: '',
        SHOPIFY_CUSTOMER_ACCOUNT_URL: '', FORMS_WEBHOOK_URL: '', FORMS_WEBHOOK_TOKEN: '',
      },
    });
    child.once('error', reject);
    child.once('exit', (value) => resolve(value ?? 1));
  });
  if (code !== 0) throw new Error('Static preview build failed. Previous output and API source will be restored.');
  if (!(await exists(inside('out/index.html')))) throw new Error('Build did not produce out/index.html.');
  await fs.writeFile(inside('out/sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n');
  await fs.writeFile(inside('out/.nojekyll'), '');
  success = true;
  console.log('Static development preview exported to out/. Payments, orders and forms are unavailable.');
} finally {
  // All recursive removals are fixed, resolved, checked descendants of the verified project root.
  if (startedBuild && await exists(nextOutput)) await fs.rm(nextOutput, { recursive: true, force: true });
  if (movedNext) await fs.rename(nextBackup, nextOutput);
  if (!success) {
    if (startedBuild && await exists(exported)) await fs.rm(exported, { recursive: true, force: true });
    if (movedExport) await fs.rename(exportBackup, exported);
  } else if (movedExport) await fs.rm(exportBackup, { recursive: true, force: true });
  if (movedSitemap) await fs.rename(sitemapBackup, sitemapSource);
  await fs.rename(backup, api);
}
