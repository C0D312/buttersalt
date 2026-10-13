import { expect, test } from '@playwright/test';
import axe from 'axe-core';
import { writeFile } from 'node:fs/promises';
const templateRoutes = ['/', '/shop', '/products/salted-caramel', '/bundles', '/build-a-box', '/gifts', '/about', '/faq', '/contact', '/cart', '/checkout', '/account', '/shipping', '/privacy'];

for (const route of templateRoutes) {
  test(`WCAG A/AA automated scan ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: {
        getRules: (tags: string[]) => { ruleId: string; tags: string[] }[];
        run: (context: Document, options: Record<string, unknown>) => Promise<{ violations: unknown[] }>;
      } }).axe;
      const rules = axe.getRules(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).filter((rule) => !rule.tags.includes('experimental')).map((rule) => rule.ruleId);
      return axe.run(document, { runOnly: { type: 'rule', values: [...new Set([...rules, 'heading-order'])] } });
    });
    const evidence = testInfo.outputPath('axe-results.json');
    await writeFile(evidence, JSON.stringify(result, null, 2));
    await testInfo.attach('axe-results', { path: evidence, contentType: 'application/json' });
    expect(result.violations).toEqual([]);
  });
}

test('reduced motion preference is honoured', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const motion = await page.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    animations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
    scrollBehaviour: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  expect(motion.reduced).toBe(true);
  expect(motion.animations).toBe(0);
  expect(motion.scrollBehaviour).not.toBe('smooth');
});
