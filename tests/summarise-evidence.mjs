import { readFile, writeFile } from 'node:fs/promises';

// Preserve original reports. This summary uses the latest observed outcome per
// uniquely named browser test after targeted repairs; it is not a fabricated run.
const reports = ['test-results/browser-full-results.json', 'test-results/browser-repair-first-results.json', 'test-results/browser-repair-results.json', 'test-results/browser-quantity-cap-results.json', 'test-results/browser-font-responsive-results.json', 'test-results/browser-font-screenshot-results.json'];
const latest = new Map();
const runStats = [];
function collect(suite, source) {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      const lastResult = test.results?.at(-1);
      const key = `${test.projectName}::${spec.file || suite.file}::${spec.title}`;
      latest.set(key, { project: test.projectName, file: spec.file || suite.file, title: spec.title, status: lastResult?.status || test.status, source });
    }
  }
  for (const child of suite.suites || []) collect(child, source);
}
for (const source of reports) {
  const report = JSON.parse(await readFile(source, 'utf8'));
  runStats.push({ source, ...report.stats });
  for (const suite of report.suites) collect(suite, source);
}
const cases = [...latest.values()];
const unit = JSON.parse(await readFile('test-results/unit-results.json', 'utf8'));
const summary = {
  generatedAt: new Date().toISOString(),
  meaning: 'Latest observed outcome for each distinct test, across the full run and targeted repair run. Original reports are preserved unchanged.',
  browsers: { distinct: cases.length, passed: cases.filter((test) => test.status === 'passed').length, failed: cases.filter((test) => test.status !== 'passed').length, runs: runStats },
  units: { passed: unit.numPassedTests, failed: unit.numFailedTests, source: 'test-results/unit-results.json' },
  testCases: cases,
};
await writeFile('test-results/final-verification.json', `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ browsers: summary.browsers, units: summary.units }, null, 2)}\n`);
if (summary.browsers.failed || summary.units.failed) process.exitCode = 1;
