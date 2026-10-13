import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { routes, screenshotRoutes, widths } from './routes';

for (const width of widths) {
  test(`every public route fits a ${width}px viewport`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    const internalLinks = new Set<string>();
    const assets = new Set<string>();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()); });
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      const bounds = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(bounds.document, `${route}: document overflow ${JSON.stringify(bounds)}`).toBeLessThanOrEqual(bounds.viewport + 1);
      expect(bounds.body, `${route}: body overflow ${JSON.stringify(bounds)}`).toBeLessThanOrEqual(bounds.viewport + 1);
      expect(pageErrors, `${route}: unhandled browser errors`).toEqual([]);
      const images = await page.locator('img').evaluateAll((elements) => elements.map((element) => {
        const image = element as HTMLImageElement;
        const bounds = image.getBoundingClientRect();
        return {
          src: image.getAttribute('src'),
          alt: image.getAttribute('alt'),
          visible: bounds.top < innerHeight && bounds.bottom > 0,
          loaded: image.complete && image.naturalWidth > 0,
        };
      }));
      expect(images.filter((image) => image.alt === null), `${route}: images missing alt attributes`).toEqual([]);
      expect(images.filter((image) => image.visible && !image.loaded), `${route}: broken visible image assets`).toEqual([]);
      if (width === 1440 && testInfo.project.name === 'chromium') {
        for (const href of await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
          if (href?.startsWith('/') && !href.startsWith('//')) internalLinks.add(href.split('#')[0]);
        }
        for (const image of images) {
          if (!image.src) continue;
          const parsed = new URL(image.src, page.url());
          const original = parsed.pathname === '/_next/image' ? parsed.searchParams.get('url') : parsed.pathname;
          if (original?.startsWith('/')) assets.add(original);
        }
      }
    }
    for (const href of internalLinks) expect((await page.request.get(href)).status(), `broken internal link: ${href}`).toBe(200);
    for (const asset of assets) expect((await page.request.get(asset)).status(), `missing image asset: ${asset}`).toBe(200);
    await testInfo.attach(`responsive-${width}`, { body: JSON.stringify({ width, routes: routes.length }), contentType: 'application/json' });
  });
}

for (const [name, route] of Object.entries(screenshotRoutes)) {
  for (const width of [390, 1440]) {
    test(`${name} ${width}px evidence screenshot`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      if (name === 'cart') {
        await page.goto('/products/salted-caramel');
        await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
        await page.getByRole('button', { name: 'Close bag' }).click();
      }
      await page.goto(route, { waitUntil: 'networkidle' });
      if (name === 'builder') {
        await page.getByRole('button', { name: 'Add Salted Caramel to box', exact: true }).click();
        await page.getByRole('button', { name: 'Add Chilli Lime to box', exact: true }).click();
        await page.getByRole('button', { name: 'Add Sweet & Salty to box', exact: true }).click();
      }
      await page.evaluate(async () => {
        for (let position = 0; position <= document.documentElement.scrollHeight; position += Math.max(200, innerHeight * 0.85)) {
          window.scrollTo(0, position);
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
        window.scrollTo(0, 0);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      const unloaded = await page.locator('img').evaluateAll((images) => images.filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0).map((image) => image.getAttribute('src')));
      expect(unloaded, 'all full-page screenshot imagery must be loaded').toEqual([]);
      const directory = `test-results/screenshots/${testInfo.project.name}`;
      await mkdir(directory, { recursive: true });
      const screenshot = `${directory}/${name}-${width}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach(`${name}-${width}`, { path: screenshot, contentType: 'image/png' });
    });
  }
}

test('unknown routes provide an actionable 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main a[href="/"], main a[href="/shop"]').first()).toBeVisible();
});
