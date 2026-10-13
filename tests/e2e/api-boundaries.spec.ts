import { expect, test } from '@playwright/test';

test('development API is explicit and never creates an order or checkout', async ({ request, baseURL }) => {
  const cart = await request.get('/api/cart');
  expect(cart.status()).toBe(200);
  expect(cart.headers()['cache-control']).toContain('no-store');
  expect(await cart.json()).toEqual({ mode: 'development', cart: null });
  const catalogue = await request.get('/api/catalogue');
  expect(catalogue.status()).toBe(200);
  const data = await catalogue.json();
  expect(data.mode).toBe('development');
  expect(data.products).toHaveLength(11);
  expect(data.products.every((product: { verified: boolean }) => !product.verified)).toBe(true);
  const mutation = await request.post('/api/cart', { headers: { Origin: baseURL! }, data: { action: 'add', variantId: 'gid://shopify/ProductVariant/123', quantity: 1, requestId: crypto.randomUUID() } });
  expect(mutation.status()).toBe(503);
  expect(await mutation.json()).toMatchObject({ error: { code: 'DEVELOPMENT_MODE' } });
  const checkout = await request.post('/api/checkout', { headers: { Origin: baseURL! }, data: {} });
  expect(checkout.status()).toBe(503);
  expect(await checkout.json()).toMatchObject({ error: { code: 'DEVELOPMENT_MODE' } });
});

test('cart mutation rejects a cross-origin request', async ({ request }) => {
  const response = await request.post('/api/cart', { headers: { Origin: 'https://attacker.example' }, data: { action: 'add', price: 0.01 } });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ error: { code: 'INVALID_ORIGIN' } });
});

test('account access fails clearly until the provider is configured', async ({ request }) => {
  const response = await request.get('/api/account');
  expect(response.status()).toBe(503);
  const data = await response.json();
  expect(data.error).toBeTruthy();
  expect(data).not.toHaveProperty('orders');
});

test('unconnected form submission cannot return fake success', async ({ request, baseURL }) => {
  const response = await request.post('/api/forms', { headers: { Origin: baseURL! }, data: { type: 'newsletter', email: 'jamie@example.com', consent: true, website: '', submissionId: crypto.randomUUID() } });
  expect(response.status()).toBe(503);
  const data = await response.json();
  expect(data).toMatchObject({ error: { code: 'FORM_UNCONNECTED' } });
  expect(data).not.toHaveProperty('success');
});

test('production responses include baseline security and indexing controls', async ({ request, page }) => {
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toMatch(/Disallow:\s*\//);
});
