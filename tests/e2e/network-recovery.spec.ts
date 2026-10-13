import { expect, test } from '@playwright/test';

test('live-mode transport failures preserve the visible cart and retry an absolute update safely', async ({ page }) => {
  const line = {
    id: 'provider-line-1', variantId: 'gid://shopify/ProductVariant/123', productSlug: 'salted-caramel', title: 'Salted Caramel',
    variantTitle: 'Confirmed provider fixture', quantity: 1, price: 11, total: 11, quantityLimit: 12,
    image: '/images/salted-caramel-bag.webp', available: true, attributes: [],
  };
  const cart = { lines: [line], subtotal: 11, total: 11, currencyCode: 'AUD', totalQuantity: 1, discounts: [], warnings: [], taxEstimated: true, shippingEstimated: true };
  let updates = 0;
  const requestIds: string[] = [];
  let checkoutContentType = '';
  await page.route('**/api/cart', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { mode: 'live', cart } });
    updates++;
    requestIds.push(route.request().postDataJSON().requestId);
    if (updates === 1) return route.fulfill({ status: 502, json: { error: { code: 'NETWORK_ERROR', message: 'The provider could not confirm this update. Your bag has been kept.' } } });
    return route.fulfill({ json: { mode: 'live', cart: { ...cart, lines: [{ ...line, quantity: 2, total: 22 }], subtotal: 22, total: 22, totalQuantity: 2 } } });
  });
  await page.route('**/api/checkout', async (route) => {
    checkoutContentType = route.request().headers()['content-type'] || '';
    return route.fulfill({ status: 503, json: { error: { code: 'CHECKOUT_DISABLED', message: 'Hosted checkout is awaiting merchant approval.' } } });
  });
  await page.goto('/cart');
  await expect(page.locator('main .quantity span')).toHaveText('1');
  await page.getByRole('button', { name: 'Increase Salted Caramel quantity' }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('could not confirm');
  await expect(page.locator('main .quantity span')).toHaveText('1');
  await expect(page.locator('main .subtotal')).toContainText('$11.00');
  await page.getByRole('button', { name: 'Increase Salted Caramel quantity' }).click();
  await expect(page.locator('main .quantity span')).toHaveText('2');
  await expect(page.locator('main .subtotal')).toContainText('$22.00');
  expect(updates).toBe(2);
  expect(requestIds[0]).toBeTruthy();
  expect(requestIds[1]).toBe(requestIds[0]);
  await page.getByRole('button', { name: 'Secure checkout', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('awaiting merchant approval');
  expect(checkoutContentType).toContain('application/json');
  await expect(page.locator('main .quantity span')).toHaveText('2');
  await expect(page).toHaveURL(/\/cart$/);
});

test('live cart quantity controls honour provider minimum and increments', async ({ page }) => {
  const initial = {
    id: 'quantity-rule-line', variantId: 'gid://shopify/ProductVariant/123', productSlug: 'salted-caramel', title: 'Salted Caramel',
    variantTitle: 'Provider quantity-rule fixture', quantity: 3, price: 11, total: 33, quantityLimit: 9, minimum: 3, increment: 3,
    image: '/images/salted-caramel-bag.webp', available: true, attributes: [],
  };
  let line = initial;
  const submitted: number[] = [];
  const publicCart = () => ({ lines: [line], subtotal: line.total, total: line.total, currencyCode: 'AUD', totalQuantity: line.quantity, discounts: [], warnings: [], taxEstimated: true, shippingEstimated: true });
  await page.route('**/api/cart', async (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      submitted.push(input.quantity);
      line = { ...line, quantity: input.quantity, total: input.quantity * 11 };
    }
    return route.fulfill({ json: { mode: 'live', cart: publicCart() } });
  });
  await page.goto('/cart');
  const decrease = page.getByRole('button', { name: 'Decrease Salted Caramel quantity' });
  const increase = page.getByRole('button', { name: 'Increase Salted Caramel quantity' });
  await expect(page.locator('main .quantity span')).toHaveText('3');
  await expect(decrease).toBeDisabled();
  await increase.click();
  await expect(page.locator('main .quantity span')).toHaveText('6');
  await increase.click();
  await expect(page.locator('main .quantity span')).toHaveText('9');
  await expect(increase).toBeDisabled();
  await decrease.click();
  await expect(page.locator('main .quantity span')).toHaveText('6');
  expect(submitted).toEqual([6, 9, 6]);
});
