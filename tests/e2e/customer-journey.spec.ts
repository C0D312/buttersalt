import { expect, test } from '@playwright/test';
import { flavourSlugs } from './routes';

test('shop search, filters, sorting and empty results work together', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.locator('.product-card')).toHaveCount(11);
  await page.getByRole('button', { name: 'Sweet', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
  await page.getByRole('searchbox', { name: 'Search flavours' }).fill('caramel');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card').getByRole('heading')).toHaveText('Salted Caramel');
  await page.getByRole('searchbox', { name: 'Search flavours' }).fill('no-such-popcorn');
  await expect(page.getByRole('heading', { name: 'No kernels here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all flavours' }).click();
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price-desc');
  await expect(page.locator('.product-card').getByRole('heading').first()).toHaveText('Discovery Box');
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('name');
  await expect(page.locator('.product-card').getByRole('heading').first()).toHaveText('Cheddar Cheese');
  await page.getByRole('button', { name: 'Savoury', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
});

test('all eight flavours expose both working photographs and selectable variants', async ({ page }) => {
  test.setTimeout(120_000);
  for (const slug of flavourSlugs) {
    await page.goto(`/products/${slug}`, { waitUntil: 'networkidle' });
    await expect(page.locator('.main-product-image img')).toHaveAttribute('alt', /concept packaging/);
    await page.getByRole('button', { name: 'View popcorn detail' }).click();
    await expect(page.locator('.main-product-image img')).toHaveAttribute('alt', /popcorn close-up/);
    await expect.poll(() => page.locator('.main-product-image img').evaluate((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await page.getByRole('button', { name: 'View packaging' }).click();
    await expect(page.locator('.main-product-image img')).toHaveAttribute('alt', /concept packaging/);
    const variants = page.locator('#product-variant');
    await expect(variants.locator('option')).toHaveCount(2);
    await variants.selectOption({ index: 1 });
    await expect(variants).toHaveValue(`concept:${slug}:sharing`);
    await expect(page.getByRole('button', { name: 'Add to bag', exact: true })).toBeEnabled();
  }
});

test('selected variant and quantities survive reload; updates and removal restore an empty bag', async ({ page }) => {
  await page.goto('/products/salted-caramel');
  await page.locator('#product-variant').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.bag-line')).toHaveCount(1);
  await expect(drawer.locator('.bag-line')).toContainText('Sharing bag');
  await expect(drawer.locator('.subtotal')).toContainText('$39.60');
  await page.getByRole('button', { name: 'Close bag' }).click();
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Increase Salted Caramel quantity' }).click();
  await expect(page.locator('main .subtotal')).toContainText('$59.40');
  await page.reload();
  await expect(page.locator('main .bag-line')).toHaveCount(1);
  await expect(page.locator('main .quantity span')).toHaveText('3');
  await expect(page.locator('main .subtotal')).toContainText('$59.40');
  await page.getByRole('button', { name: 'Decrease Salted Caramel quantity' }).click();
  await expect(page.locator('main .quantity span')).toHaveText('2');
  await page.getByRole('button', { name: 'Remove Salted Caramel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Good things await.' })).toBeVisible();
  await expect(page.locator('main .bag-line')).toHaveCount(0);
  await expect(page.locator('main').getByRole('button', { name: /checkout/i })).toHaveCount(0);
});

test('discovery bundle is represented in the preview bag, with checkout explicitly blocked', async ({ page }) => {
  await page.goto('/products/discovery-box');
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer.locator('.bag-line')).toContainText('The Discovery Box');
  await drawer.getByRole('button', { name: 'Checkout · preview only' }).click();
  await expect(drawer.getByRole('alert')).toContainText('development preview');
  await expect(page).toHaveURL(/products\/discovery-box/);
});

test('mixed box enforces capacity and preserves six component selections', async ({ page }) => {
  await page.goto('/build-a-box');
  await expect(page.getByRole('button', { name: 'Choose 6 more bags' })).toBeDisabled();
  const names = ['Butter & Sea Salt', 'Sweet & Salty', 'Salted Caramel', 'Cheddar Cheese', 'Chocolate Drizzle', 'Chilli Lime'];
  for (const name of names) await page.getByRole('button', { name: `Add ${name} to box`, exact: true }).click();
  await expect(page.getByText('6 / 6 selected', { exact: true })).toBeVisible();
  for (const name of names) await expect(page.getByRole('button', { name: `Add ${name} to box`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove Butter & Sea Salt from box', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose 1 more bag' })).toBeDisabled();
  await page.getByRole('button', { name: 'Add Cinnamon Sugar to box', exact: true }).click();
  await page.getByRole('button', { name: 'Add mixed box to bag' }).click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer.locator('.bag-line')).toHaveCount(6);
  await expect(drawer.getByText('Part of your mixed box', { exact: true })).toHaveCount(6);
  await page.getByRole('button', { name: 'Close bag' }).click();
  await page.goto('/cart');
  await page.reload();
  await expect(page.locator('main .bag-line')).toHaveCount(6);
  await expect(page.locator('main').getByText('Part of your mixed box', { exact: true })).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Open bag, 6 items' })).toBeVisible();
});

test('mixed-box and standalone items with the same flavour remain separate after reload', async ({ page }) => {
  await page.goto('/build-a-box');
  for (let index = 0; index < 6; index++) await page.getByRole('button', { name: 'Add Salted Caramel to box', exact: true }).click();
  await page.getByRole('button', { name: 'Add mixed box to bag' }).click();
  await page.getByRole('button', { name: 'Close bag' }).click();
  await page.goto('/products/salted-caramel');
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('button', { name: 'Close bag' }).click();
  await page.goto('/cart');
  await page.reload();
  await expect(page.locator('main .bag-line')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Open bag, 7 items' })).toBeVisible();
  const mixed = page.locator('main .bag-line').filter({ hasText: 'Part of your mixed box' });
  await mixed.getByRole('button', { name: 'Remove Salted Caramel', exact: true }).click();
  await expect(page.locator('main .bag-line')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open bag, 1 items' })).toBeVisible();
});

test('corrupt saved baskets recover and fixture prices are recomputed', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('buttersalt-preview-bag', 'not valid JSON'));
  await page.reload();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Good things await.' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('buttersalt-preview-bag', JSON.stringify([{ variantId: 'concept:salted-caramel:signature', quantity: 1, price: 0.01, total: 0.01 }])));
  await page.reload();
  await expect(page.locator('main .subtotal')).toContainText('$11.00');
});

test('variant limits count quantities in every mixed-box group', async ({ page }) => {
  await page.goto('/build-a-box');
  for (let index = 0; index < 6; index++) await page.getByRole('button', { name: 'Add Salted Caramel to box', exact: true }).click();
  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'Add mixed box to bag' }).click();
    await page.getByRole('button', { name: 'Close bag' }).click();
  }
  await expect(page.getByRole('button', { name: 'Add mixed box to bag' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Open bag, 12 items' })).toBeVisible();
  await page.goto('/cart');
  await page.reload();
  await expect(page.locator('main .bag-line')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Increase Salted Caramel quantity', exact: true }).first()).toBeDisabled();
  await expect(page.locator('main .quantity span')).toHaveText(['6', '6']);
  await expect(page.getByRole('button', { name: 'Open bag, 12 items' })).toBeVisible();
});

test('form errors stay truthful and preserve entered details when delivery is unconnected', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Your name', { exact: true }).fill('Jamie Test');
  await page.getByLabel('Email address', { exact: true }).fill('jamie@example.com');
  await page.getByLabel('Your message', { exact: true }).fill('Please tell me about the gift range.');
  await page.locator('main input[name="consent"]').check();
  await page.getByRole('button', { name: 'Send your message' }).click();
  await expect(page.locator('main [role="alert"]')).toContainText(/not connected|not been sent/i);
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Jamie Test');
  await expect(page.getByLabel('Your message', { exact: true })).toHaveValue('Please tell me about the gift range.');
  await expect(page.locator('main [role="status"]')).toHaveCount(0);
});

test('mobile navigation and bag drawer contain keyboard focus and restore it on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const openNavigation = page.getByRole('button', { name: 'Open navigation' });
  await openNavigation.focus();
  await page.keyboard.press('Enter');
  const navigation = page.getByRole('dialog', { name: 'Navigation' });
  await expect(navigation).toBeFocused();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await navigation.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(navigation).toHaveCount(0);
  await expect(openNavigation).toBeFocused();
  const bag = page.getByRole('button', { name: /Open bag/ });
  await bag.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(bag).toBeFocused();
});

test('invalid discount explains provider validation and does not alter fixture totals', async ({ page }) => {
  await page.goto('/products/salted-caramel');
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('button', { name: 'Close bag' }).click();
  await page.goto('/cart');
  await page.getByLabel('Discount code').fill('INVALID-PROMO');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('validated by Shopify');
  await expect(page.locator('main .subtotal')).toContainText('$11.00');
});
