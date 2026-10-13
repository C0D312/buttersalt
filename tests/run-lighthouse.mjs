import { mkdir, writeFile } from 'node:fs/promises';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

// Run against `npm run build && npm run start`. Nine equal mobile measurements.
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = new URL('../test-results/lighthouse/', import.meta.url);
const routes = ['/', '/shop', '/products/salted-caramel'];
await mkdir(output, { recursive: true });
const summary = { measuredAt: new Date().toISOString(), origin, formFactor: 'mobile', throttlingMethod: 'simulate', runsPerPage: 3, settings: null, environment: null, pages: [] };
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--disable-gpu', '--no-first-run'], ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}) });
try {
  for (const route of routes) {
    const runs = [];
    for (let index = 1; index <= 3; index++) {
      const result = await lighthouse(`${origin}${route}`, { port: chrome.port, output: ['json', 'html'], logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor: 'mobile', throttlingMethod: 'simulate' });
      if (!result) throw new Error('Lighthouse did not return a result');
      const name = route === '/' ? 'home' : route.replaceAll('/', '-').slice(1);
      const reports = result.report;
      await writeFile(new URL(`${name}-${index}.json`, output), reports[0]);
      await writeFile(new URL(`${name}-${index}.html`, output), reports[1]);
      if (result.lhr.runtimeError) throw new Error(`Lighthouse runtime failure: ${result.lhr.runtimeError.code}`);
      summary.environment ??= result.lhr.environment;
      summary.settings ??= {
        lighthouseVersion: result.lhr.lighthouseVersion,
        screenEmulation: result.lhr.configSettings.screenEmulation,
        throttling: result.lhr.configSettings.throttling,
        locale: result.lhr.configSettings.locale,
      };
      const record = {
        run: index,
        performance: result.lhr.categories.performance.score * 100,
        accessibility: result.lhr.categories.accessibility.score * 100,
        bestPractices: result.lhr.categories['best-practices'].score * 100,
        seo: result.lhr.categories.seo.score * 100,
        lcpMs: result.lhr.audits['largest-contentful-paint'].numericValue,
        cls: result.lhr.audits['cumulative-layout-shift'].numericValue,
        warnings: result.lhr.runWarnings,
        failedAudits: Object.values(result.lhr.audits).filter((audit) => audit.score !== null && audit.score < 1).map((audit) => ({ id: audit.id, title: audit.title, displayValue: audit.displayValue })),
      };
      runs.push(record);
      process.stdout.write(`${route} ${index}: ${JSON.stringify(record)}\n`);
    }
    summary.pages.push({ route, runs, median: Object.fromEntries(['performance', 'accessibility', 'bestPractices', 'seo', 'lcpMs', 'cls'].map((key) => [key, median(runs.map((run) => run[key]))])) });
  }
} finally {
  await chrome.kill();
}
await writeFile(new URL('summary.json', output), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary.pages.map((page) => ({ route: page.route, ...page.median })), null, 2)}\n`);
