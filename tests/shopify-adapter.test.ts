import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cookie: 'gid://shopify/Cart/private-session?key=secret',
  setCookie: vi.fn(),
  env: {
    COMMERCE_MODE: 'live', SHOPIFY_STORE_DOMAIN: 'fixture.myshopify.com',
    SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'test-only-placeholder-token',
    SHOPIFY_CHECKOUT_ENABLED: 'true', SHOPIFY_CHECKOUT_HOST: undefined as string | undefined,
    MARKET_COUNTRY: 'AU', MARKET_CURRENCY: 'AUD',
  },
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.cookie ? { value: state.cookie } : undefined, set: state.setCookie }) }));
vi.mock('../src/lib/env', () => ({
  SHOPIFY_API_VERSION: '2026-10',
  getEnv: () => state.env,
  commerceConfigured: () => state.env.COMMERCE_MODE === 'live',
  verifiedHandles: () => new Set<string>(),
}));

import { changeCart, getCart, getCatalogue, getCheckoutUrl, publicCart, requireLiveCommerce } from '../src/lib/shopify';

type RawCart = Parameters<typeof publicCart>[0];
type RawVariant = RawCart['lines']['nodes'][number]['merchandise'];
const variantId = 'gid://shopify/ProductVariant/123';
const requestId = 'ab123456-1234-4234-8234-123456789abc';
const money = (amount: string) => ({ amount, currencyCode: 'AUD' });

function variant(overrides: Partial<RawVariant> = {}): RawVariant {
  return {
    id: variantId, title: 'Confirmed signature bag', price: money('11.00'), availableForSale: true, quantityAvailable: 12,
    quantityRule: { minimum: 1, maximum: 12, increment: 1 }, image: null,
    product: {
      id: 'gid://shopify/Product/42', handle: 'salted-caramel', title: 'Salted Caramel', description: 'Verified test fixture', tags: ['buttersalt'], featuredImage: null,
      verified: { value: 'true' }, ingredients: { value: 'Confirmed test fixture' }, allergens: { value: 'Confirmed test fixture' }, nutrition: { value: 'Confirmed test fixture' },
      shortName: null, category: { value: 'sweet' }, colour: null, accent: null, note: null, packSize: { value: 'Confirmed test fixture' }, weight: { value: 'Confirmed test fixture' },
    }, ...overrides,
  };
}

function cart(lines: RawCart['lines']['nodes'] = []): RawCart {
  return {
    id: state.cookie, checkoutUrl: 'https://fixture.myshopify.com/checkouts/test', totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    lines: { nodes: lines, pageInfo: { hasNextPage: false } }, discountCodes: [],
    cost: { subtotalAmount: money('22.00'), totalAmount: money('22.00'), totalAmountEstimated: true, checkoutChargeAmount: money('22.00') },
  };
}

function line(overrides: Partial<RawCart['lines']['nodes'][number]> = {}): RawCart['lines']['nodes'][number] {
  return { id: 'line-1', quantity: 2, attributes: [], cost: { totalAmount: money('22.00'), amountPerQuantity: money('11.00') }, merchandise: variant(), ...overrides };
}

function provider(current: RawCart, variants = [variant()]) {
  const mutations: { query: string; variables: Record<string, unknown> }[] = [];
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> };
    if (body.query.includes('query Variants')) return Response.json({ data: { nodes: variants } });
    if (body.query.includes('query Cart')) return Response.json({ data: { cart: current } });
    if (body.query.startsWith('mutation')) {
      mutations.push(body);
      const name = body.query.includes('cartLinesAdd(') ? 'cartLinesAdd' : body.query.includes('cartLinesUpdate(') ? 'cartLinesUpdate' : body.query.includes('cartLinesRemove(') ? 'cartLinesRemove' : 'cartDiscountCodesUpdate';
      return Response.json({ data: { [name]: { cart: current, userErrors: [], warnings: [] } } });
    }
    throw new Error('Unexpected provider query');
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, mutations };
}

beforeEach(() => {
  state.cookie = 'gid://shopify/Cart/private-session?key=secret';
  state.env.COMMERCE_MODE = 'live';
  state.env.SHOPIFY_CHECKOUT_ENABLED = 'true';
  state.env.SHOPIFY_CHECKOUT_HOST = undefined;
  state.setCookie.mockReset();
  vi.unstubAllGlobals();
});

describe('Shopify adapter with independently mocked provider responses', () => {
  it('gates commerce in development and checkout until explicitly enabled', async () => {
    state.env.COMMERCE_MODE = 'development';
    expect(() => requireLiveCommerce()).toThrow('unavailable in this development preview');
    state.env.COMMERCE_MODE = 'live';
    state.env.SHOPIFY_CHECKOUT_ENABLED = 'false';
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'CHECKOUT_DISABLED' });
  });

  it('does not expose the provider cart secret, checkout URL or idempotency key', () => {
    const result = publicCart(cart([line({ attributes: [{ key: '_request_id', value: requestId }, { key: '_box_group', value: 'box-1' }] })]));
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('checkouts/test');
    expect(JSON.stringify(result)).not.toContain(requestId);
    expect(result.lines[0].attributes).toEqual([{ key: '_box_group', value: 'box-1' }]);
  });

  it('uses provider cost amounts even when the fixture concept price differs', () => {
    const result = publicCart(cart([line({ cost: { totalAmount: money('35.00'), amountPerQuantity: money('17.50') } })]));
    expect(result.lines[0].price).toBe(17.5);
    expect(result.lines[0].total).toBe(35);
  });

  it.each(['-1.00', 'NaN', '1e309', 'not-price', '9007199254740992'])('rejects malformed provider money %s', (amount) => {
    expect(() => publicCart(cart([line({ cost: { totalAmount: money('22.00'), amountPerQuantity: money(amount) } })]))).toThrowError(expect.objectContaining({ code: 'INVALID_PROVIDER_PRICE' }));
  });

  it('marks stock below the provider minimum unavailable', () => {
    const result = publicCart(cart([line({ merchandise: variant({ quantityAvailable: 2, quantityRule: { minimum: 3, maximum: 12, increment: 3 } }) })]));
    expect(result.lines[0]).toMatchObject({ available: false, quantityLimit: 0 });
  });

  it('rounds the stock cap down to a valid provider quantity increment', () => {
    const result = publicCart(cart([line({ merchandise: variant({ quantityAvailable: 10, quantityRule: { minimum: 3, maximum: 10, increment: 3 } }) })]));
    expect(result.lines[0]).toMatchObject({ available: true, quantityLimit: 9 });
  });

  it.each([{ minimum: 0, maximum: 12, increment: 1 }, { minimum: 1, maximum: 12, increment: 0 }])('rejects invalid provider quantity rules %j', (quantityRule) => {
    const result = publicCart(cart([line({ merchandise: variant({ quantityRule }) })]));
    expect(result.lines[0]).toMatchObject({ available: false, quantityLimit: 0 });
  });

  it('maps a native bundle parent to bundles even if its editable category is a flavour', async () => {
    const parent = variant({ requiresComponents: true });
    const product = { ...parent.product, variants: { nodes: [parent], pageInfo: { hasNextPage: false } }, images: { nodes: [] } };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { products: { nodes: [product], pageInfo: { hasNextPage: false, endCursor: null } } } })));
    const result = await getCatalogue();
    expect(result.products[0]).toMatchObject({ category: 'bundles', isBundle: true });
  });

  it('rejects sold-out stock before issuing an add mutation', async () => {
    const mock = provider(cart(), [variant({ availableForSale: false, quantityAvailable: 0 })]);
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'QUANTITY_UNAVAILABLE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('rejects missing confirmed food information before issuing a mutation', async () => {
    const unavailable = variant();
    unavailable.product.allergens = null;
    const mock = provider(cart(), [unavailable]);
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'PRODUCT_UNVERIFIED' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('counts existing cart quantities when inventory falls during shopping', async () => {
    const mock = provider(cart([line({ quantity: 2 })]), [variant({ quantityAvailable: 2 })]);
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'QUANTITY_UNAVAILABLE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('rejects prices from an unsupported market currency', async () => {
    const mock = provider(cart(), [variant({ price: { amount: '11.00', currencyCode: 'USD' } })]);
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'UNSUPPORTED_CURRENCY' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('blocks malformed fresh variant prices before issuing a mutation', async () => {
    const mock = provider(cart(), [variant({ price: money('NaN') })]);
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'INVALID_PROVIDER_PRICE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('creates a mixed box as inventory-tracked provider lines with a shared fulfilment group', async () => {
    const second = 'gid://shopify/ProductVariant/456';
    const mock = provider(cart(), [variant(), variant({ id: second })]);
    await changeCart({ action: 'box', requestId, components: [{ variantId, quantity: 2 }, { variantId: second, quantity: 2 }, { variantId, quantity: 2 }] });
    expect(mock.mutations).toHaveLength(1);
    expect(mock.mutations[0].variables.value).toEqual([
      expect.objectContaining({ merchandiseId: variantId, quantity: 4, attributes: expect.arrayContaining([{ key: '_request_id', value: requestId }, { key: '_box_group', value: requestId }, { key: '_box_size', value: '6' }]) }),
      expect.objectContaining({ merchandiseId: second, quantity: 2, attributes: expect.arrayContaining([{ key: '_request_id', value: requestId }, { key: '_box_group', value: requestId }, { key: '_box_size', value: '6' }]) }),
    ]);
  });

  it.each([1, 5, 7])('rejects an incomplete or overfull box of %s bags', async (quantity) => {
    const mock = provider(cart());
    await expect(changeCart({ action: 'box', requestId, components: [{ variantId, quantity }] })).rejects.toMatchObject({ code: 'BOX_SIZE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('rejects native bundle variants as individual mixed-box components', async () => {
    const mock = provider(cart(), [variant({ requiresComponents: true })]);
    await expect(changeCart({ action: 'box', requestId, components: [{ variantId, quantity: 6 }] })).rejects.toMatchObject({ code: 'BOX_COMPONENT' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('recovers repeated add requests from persisted provider line metadata', async () => {
    const initial = provider(cart());
    await changeCart({ action: 'add', variantId, quantity: 2, requestId });
    const addedLines = initial.mutations[0].variables.value as { attributes: { key: string; value: string }[] }[];
    const mock = provider(cart([line({ attributes: addedLines[0].attributes })]));
    const result = await changeCart({ action: 'add', variantId, quantity: 2, requestId });
    expect(result.totalQuantity).toBe(2);
    expect(mock.mutations).toHaveLength(0);
  });

  it('rejects a reused add reference with different item quantities', async () => {
    const initial = provider(cart());
    await changeCart({ action: 'add', variantId, quantity: 2, requestId });
    const addedLines = initial.mutations[0].variables.value as { attributes: { key: string; value: string }[] }[];
    const mock = provider(cart([line({ attributes: addedLines[0].attributes })]));
    await expect(changeCart({ action: 'add', variantId, quantity: 3, requestId })).rejects.toMatchObject({ code: 'DUPLICATE_REFERENCE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('makes repeated removal a successful no-op', async () => {
    const mock = provider(cart());
    expect((await changeCart({ action: 'remove', lineId: 'already-removed', requestId })).lines).toEqual([]);
    expect(mock.mutations).toHaveLength(0);
  });

  it('blocks checkout when a mixed-box component was removed', async () => {
    const mock = provider(cart([line({ quantity: 5, attributes: [{ key: '_box_group', value: 'group-1' }] })]));
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'BOX_INCOMPLETE' });
    expect(mock.mutations).toHaveLength(0);
  });

  it('blocks a malicious provider checkout destination', async () => {
    const current = cart([line()]);
    current.checkoutUrl = 'https://attacker.example/checkout';
    provider(current);
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'INVALID_CHECKOUT' });
  });

  it('rejects checkout URLs containing user credentials even on a trusted hostname', async () => {
    const current = cart([line()]);
    current.checkoutUrl = 'https://username:password@fixture.myshopify.com/checkouts/test';
    provider(current);
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'INVALID_CHECKOUT' });
  });

  it('revalidates current stock immediately before the hosted checkout handoff', async () => {
    provider(cart([line()]), [variant({ quantityAvailable: 1 })]);
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'QUANTITY_UNAVAILABLE' });
  });

  it('blocks malformed provider totals before a hosted checkout handoff', async () => {
    const current = cart([line()]);
    current.cost.totalAmount = money('NaN');
    provider(current);
    await expect(getCheckoutUrl()).rejects.toMatchObject({ code: 'INVALID_PROVIDER_PRICE' });
  });

  it('allows a valid secure hosted checkout handoff', async () => {
    provider(cart([line()]));
    await expect(getCheckoutUrl()).resolves.toBe('https://fixture.myshopify.com/checkouts/test');
  });

  it('retries a read once after a transient network failure', async () => {
    const mock = provider(cart());
    mock.fetch.mockRejectedValueOnce(new TypeError('temporary network failure'));
    await expect(getCart()).resolves.toMatchObject({ lines: [] });
    expect(mock.fetch).toHaveBeenCalledTimes(2);
  });

  it('never silently retries an uncertain cart mutation', async () => {
    const mock = provider(cart());
    mock.fetch.mockImplementationOnce(async () => Response.json({ data: { cart: cart() } }));
    mock.fetch.mockImplementationOnce(async () => Response.json({ data: { nodes: [variant()] } }));
    mock.fetch.mockRejectedValueOnce(new TypeError('connection dropped after sending mutation'));
    await expect(changeCart({ action: 'add', variantId, quantity: 1, requestId })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(mock.fetch).toHaveBeenCalledTimes(3);
  });
});
