import 'server-only';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { products as concepts, type Product, type ProductCategory } from './catalogue';
import type { Attribute, Money, PublicCart } from './commerce-types';
import { commerceConfigured, getEnv, SHOPIFY_API_VERSION, verifiedHandles } from './env';
import { CommerceError } from './http';
import { mixedBoxQuantity, quantityAllowed, type CartAction } from './commerce-validation';
import { settings } from './content';
import { brand, policies, type PolicyKey } from './content';

const COOKIE = 'buttersalt_cart';
const MAX_QUANTITY = 12;
type Field = { value: string } | null;
type RawProduct = {
  id: string; handle: string; title: string; description: string; tags: string[];
  featuredImage: { url: string; altText: string | null } | null;
  images?: { nodes: { url: string }[] };
  verified: Field; ingredients: Field; allergens: Field; nutrition: Field;
  shortName: Field; category: Field; colour: Field; accent: Field; note: Field; packSize: Field; weight: Field;
  variants?: { nodes: RawVariant[]; pageInfo?: { hasNextPage: boolean } };
};
type RawVariant = {
  id: string; title: string; price: Money; availableForSale: boolean;
  requiresComponents?: boolean;
  quantityAvailable: number | null; quantityRule: { minimum: number; maximum: number | null; increment: number };
  image?: { url: string } | null; product: RawProduct;
};
type RawLine = { id: string; quantity: number; attributes: Attribute[]; cost: { totalAmount: Money; amountPerQuantity: Money }; merchandise: RawVariant };
type RawCart = {
  id: string; checkoutUrl: string; totalQuantity: number; lines: { nodes: RawLine[]; pageInfo: { hasNextPage: boolean } };
  discountCodes: { code: string; applicable: boolean }[];
  cost: { subtotalAmount: Money; totalAmount: Money; totalAmountEstimated: boolean; checkoutChargeAmount: Money };
};
type MutationPayload = { cart: RawCart | null; userErrors: { code?: string; message: string }[]; warnings: { code: string; message: string }[] };

const PRODUCT_FIELDS = `
  id handle title description tags featuredImage { url altText }
  verified: metafield(namespace:"buttersalt", key:"food_verified") { value }
  ingredients: metafield(namespace:"buttersalt", key:"ingredients") { value }
  allergens: metafield(namespace:"buttersalt", key:"allergens") { value }
  nutrition: metafield(namespace:"buttersalt", key:"nutrition") { value }
  shortName: metafield(namespace:"buttersalt", key:"short_name") { value }
  category: metafield(namespace:"buttersalt", key:"category") { value }
  colour: metafield(namespace:"buttersalt", key:"colour") { value }
  accent: metafield(namespace:"buttersalt", key:"accent") { value }
  note: metafield(namespace:"buttersalt", key:"note") { value }
  packSize: metafield(namespace:"buttersalt", key:"pack_size") { value }
  weight: metafield(namespace:"buttersalt", key:"weight_label") { value }
`;
const VARIANT_FIELDS = `id title price { amount currencyCode } availableForSale quantityAvailable requiresComponents quantityRule { minimum maximum increment } image { url }`;
const CART_FIELDS = `
  id checkoutUrl totalQuantity discountCodes { code applicable }
  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } totalAmountEstimated checkoutChargeAmount { amount currencyCode } }
  lines(first:250) { pageInfo { hasNextPage } nodes {
    id quantity attributes { key value }
      cost { totalAmount { amount currencyCode } amountPerQuantity { amount currencyCode } }
      merchandise { ... on ProductVariant { ${VARIANT_FIELDS} product { ${PRODUCT_FIELDS} } } }
  } }
`;

export function requireLiveCommerce() {
  if (!commerceConfigured()) throw new CommerceError('DEVELOPMENT_MODE', 'Checkout and orders are unavailable in this development preview. Merchant services must be configured first.', 503);
}

/** Queries can retry once. Mutations never retry automatically after an uncertain result. */
async function storefront<T>(query: string, variables: Record<string, unknown> = {}, buyerIp?: string): Promise<T> {
  requireLiveCommerce();
  const env = getEnv();
  const mutation = query.trimStart().startsWith('mutation');
  for (let attempt = 0; attempt < (mutation ? 1 : 2); attempt++) {
    try {
      const response = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN!, ...(buyerIp ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}) },
        body: JSON.stringify({ query, variables: { country: env.MARKET_COUNTRY, ...variables } }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new CommerceError('PROVIDER_UNAVAILABLE', 'The shop is temporarily unavailable. Your basket has been kept. Please try again.', 502);
      const envelope = await response.json() as { data?: T; errors?: { message: string }[] };
      if (envelope.errors?.length || !envelope.data) throw new CommerceError('PROVIDER_ERROR', 'The shop could not complete this request. Please refresh your basket and try again.', 502);
      return envelope.data;
    } catch (error) {
      if (attempt + 1 === (mutation ? 1 : 2)) throw error instanceof CommerceError ? error : new CommerceError('NETWORK_ERROR', 'The shop could not confirm this request. Refresh your basket before trying again.', 502);
    }
  }
  throw new CommerceError('PROVIDER_UNAVAILABLE', 'The shop is temporarily unavailable.', 502);
}

function field(value: Field | undefined) { return value?.value.trim() || null; }
function verified(product: RawProduct) {
  const approved = field(product.verified) === 'true' || verifiedHandles().has(product.handle);
  return approved && product.tags.includes('buttersalt') && Boolean(field(product.ingredients) && field(product.allergens) && field(product.nutrition) && field(product.packSize) && field(product.weight));
}
function amount(value: string) {
  const number = Number(value);
  if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.round(number * 100))) throw new CommerceError('INVALID_PROVIDER_PRICE', 'The shop returned an invalid price. Please try again later.', 502);
  return number;
}
function limit(variant: RawVariant) {
  if (!variant.availableForSale || !verified(variant.product)) return 0;
  const { minimum, increment } = variant.quantityRule;
  const ceiling = Math.max(0, Math.min(MAX_QUANTITY, variant.quantityRule.maximum ?? MAX_QUANTITY, variant.quantityAvailable ?? MAX_QUANTITY));
  if (!Number.isInteger(minimum) || minimum < 1 || !Number.isInteger(increment) || increment < 1 || ceiling < minimum) return 0;
  return minimum + Math.floor((ceiling - minimum) / increment) * increment;
}
function productFromShopify(product: RawProduct): Product {
  const concept = concepts.find((entry) => entry.slug === product.handle);
  const categoryValue = field(product.category);
  const category: ProductCategory = product.variants?.nodes.some((variant) => variant.requiresComponents) ? 'bundles' : categoryValue === 'sweet' || categoryValue === 'savoury' || categoryValue === 'bundles' ? categoryValue : concept?.category ?? 'savoury';
  const variants = (product.variants?.nodes ?? []).map((variant) => {
    variant.product = product;
    return { id: variant.id, label: variant.title, price: amount(variant.price.amount), available: limit(variant) > 0 && variant.price.currencyCode === getEnv().MARKET_CURRENCY, quantityLimit: limit(variant), minimum: variant.quantityRule.minimum, increment: variant.quantityRule.increment };
  });
  return {
    id: product.id, slug: product.handle, name: product.title, shortName: field(product.shortName) ?? concept?.shortName ?? product.title,
    category, colour: /^#[0-9a-f]{6}$/i.test(field(product.colour) ?? '') ? field(product.colour)! : concept?.colour ?? '#F7D84A',
    accent: /^#[0-9a-f]{6}$/i.test(field(product.accent) ?? '') ? field(product.accent)! : concept?.accent ?? '#352A1F',
    description: product.description, note: field(product.note) ?? concept?.note ?? '', price: variants[0]?.price ?? 0,
    image: product.featuredImage?.url ?? concept?.image ?? '/images/family.webp',
    closeup: product.images?.nodes[1]?.url ?? product.featuredImage?.url ?? concept?.closeup ?? '/images/family.webp',
    variants, verified: verified(product), ingredients: field(product.ingredients), allergens: field(product.allergens), nutrition: field(product.nutrition),
    packSize: field(product.packSize), weight: field(product.weight), currencyCode: product.variants?.nodes[0]?.price.currencyCode ?? getEnv().MARKET_CURRENCY,
    isBundle: category === 'bundles',
  };
}

export async function getCatalogue(): Promise<{ mode: 'development' | 'live'; products: Product[] }> {
  if (!commerceConfigured()) return { mode: 'development', products: concepts };
  const products: Product[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const data: { products: { nodes: RawProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await storefront(`query Catalogue($country:CountryCode!,$cursor:String) @inContext(country:$country) { products(first:100,after:$cursor,query:"tag:buttersalt") { nodes { ${PRODUCT_FIELDS} images(first:2) { nodes { url } } variants(first:100) { pageInfo { hasNextPage } nodes { ${VARIANT_FIELDS} } } } pageInfo { hasNextPage endCursor } } }`, { cursor });
    for (const product of data.products.nodes) {
      if (product.variants?.pageInfo?.hasNextPage) throw new CommerceError('CATALOGUE_TOO_LARGE', 'This product has too many variants for this storefront configuration.', 503);
      products.push(productFromShopify(product));
    }
    if (!data.products.pageInfo.hasNextPage) return { mode: 'live', products };
    cursor = data.products.pageInfo.endCursor;
  }
  throw new CommerceError('CATALOGUE_TOO_LARGE', 'The catalogue exceeds the configured storefront limit.', 503);
}

/** Plain-text shop metafields are owner-editable; no external HTML is rendered. */
export async function getStoreContent() {
  if (!commerceConfigured()) return { brand, settings, policies };
  const keys = ['hero_eyebrow', 'hero_heading', 'hero_description', 'about', 'gift', 'newsletter', 'delivery', 'contact_email', 'legal_entity', 'business_address', 'shipping_policy', 'returns_policy', 'privacy_policy', 'terms_policy'];
  type CopyField = { key: string; value: string };
  const data = await storefront<{ shop: { metafields: (CopyField | null)[] }; metaobject: { fields: { key: string; value: string | null }[] } | null }>(`query Content($country:CountryCode!,$fields:[HasMetafieldsIdentifier!]!) @inContext(country:$country) { shop { metafields(identifiers:$fields) { key value } } metaobject(handle:{type:"buttersalt_site_content",handle:"storefront"}) { fields { key value } } }`, { fields: keys.map((key) => ({ namespace: 'buttersalt', key })) });
  const fields = [...data.shop.metafields.filter((entry): entry is CopyField => Boolean(entry)), ...(data.metaobject?.fields ?? []).filter((entry): entry is CopyField => typeof entry.value === 'string')];
  const copy = Object.fromEntries(fields.map((entry) => [entry.key, entry.value.trim().slice(0, 12000)]));
  const livePolicies = { ...policies };
  for (const policy of ['shipping', 'returns', 'privacy', 'terms'] as PolicyKey[]) {
    if (copy[`${policy}_policy`]) livePolicies[policy] = { ...policies[policy], status: 'Merchant policy', paragraphs: copy[`${policy}_policy`].split(/\n\s*\n/).filter(Boolean) };
  }
  return {
    brand: { ...brand, heroEyebrow: copy.hero_eyebrow || brand.heroEyebrow, heroHeading: copy.hero_heading || brand.heroHeading, heroDescription: copy.hero_description || brand.heroDescription, about: copy.about || brand.about, gift: copy.gift || brand.gift, newsletter: copy.newsletter || brand.newsletter },
    settings: { ...settings, development: false, currency: getEnv().MARKET_CURRENCY, country: getEnv().MARKET_COUNTRY, delivery: copy.delivery || settings.delivery, contactEmail: copy.contact_email || null, legalEntity: copy.legal_entity || null, businessAddress: copy.business_address || null },
    policies: livePolicies,
  };
}

async function getVariants(ids: string[], ip?: string) {
  const data = await storefront<{ nodes: (RawVariant | null)[] }>(`query Variants($country:CountryCode!,$ids:[ID!]!) @inContext(country:$country) { nodes(ids:$ids) { ... on ProductVariant { ${VARIANT_FIELDS} product { ${PRODUCT_FIELDS} } } } }`, { ids }, ip);
  return new Map(data.nodes.filter((node): node is RawVariant => Boolean(node?.id)).map((variant) => [variant.id, variant]));
}

async function setCartCookie(id: string) {
  (await cookies()).set(COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 10 });
}
export async function cartCookie() { return (await cookies()).get(COOKIE)?.value; }
async function cartById(id: string, ip?: string) {
  const data = await storefront<{ cart: RawCart | null }>(`query Cart($country:CountryCode!,$id:ID!) @inContext(country:$country) { cart(id:$id) { ${CART_FIELDS} } }`, { id }, ip);
  if (data.cart?.lines.pageInfo.hasNextPage) throw new CommerceError('CART_TOO_LARGE', 'Your basket has too many items. Please contact the merchant.', 409);
  return data.cart;
}
async function createCart(ip?: string) {
  const data = await storefront<{ cartCreate: MutationPayload }>(`mutation CreateCart($country:CountryCode!,$input:CartInput!) @inContext(country:$country) { cartCreate(input:$input) { cart { ${CART_FIELDS} } userErrors { code message } warnings { code message } } }`, { input: { buyerIdentity: { countryCode: getEnv().MARKET_COUNTRY } } }, ip);
  const cart = payloadCart(data.cartCreate);
  await setCartCookie(cart.id);
  return cart;
}
async function currentCart(ip?: string) {
  const id = await cartCookie();
  return (id ? await cartById(id, ip) : null) ?? await createCart(ip);
}
function payloadCart(payload: MutationPayload) {
  if (payload.userErrors.length || !payload.cart) throw new CommerceError('CART_REJECTED', payload.userErrors[0]?.message ?? 'The basket could not be updated.', 409);
  return payload.cart;
}
export function publicCart(cart: RawCart, warnings: string[] = []): PublicCart {
  return {
    lines: cart.lines.nodes.map((line) => ({
      id: line.id, variantId: line.merchandise.id, productSlug: line.merchandise.product.handle, title: line.merchandise.product.title,
      variantTitle: line.merchandise.title, quantity: line.quantity, price: amount(line.cost.amountPerQuantity.amount), total: amount(line.cost.totalAmount.amount),
      available: limit(line.merchandise) > 0, quantityLimit: limit(line.merchandise), image: line.merchandise.image?.url ?? line.merchandise.product.featuredImage?.url ?? null,
      minimum: line.merchandise.quantityRule.minimum, increment: line.merchandise.quantityRule.increment,
      attributes: line.attributes.filter((attribute) => attribute.key === '_box_group' || attribute.key === '_box_size'),
    })),
    subtotal: amount(cart.cost.subtotalAmount.amount), total: amount(cart.cost.totalAmount.amount), discounts: cart.discountCodes,
    currencyCode: cart.cost.totalAmount.currencyCode, totalQuantity: cart.totalQuantity,
    taxEstimated: true, shippingEstimated: true, warnings,
  };
}
export async function getCart(ip?: string) { requireLiveCommerce(); return publicCart(await currentCart(ip)); }

const locks = new Map<string, Promise<unknown>>();
async function serial<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}

async function validateQuantities(cart: RawCart, components: { variantId: string; quantity: number }[], replaceLine?: string, ip?: string) {
  const variants = await getVariants(components.map((component) => component.variantId), ip);
  for (const component of components) {
    const variant = variants.get(component.variantId);
    if (!variant || !verified(variant.product)) throw new CommerceError('PRODUCT_UNVERIFIED', 'This product is unavailable until its food information has been confirmed.', 409);
    amount(variant.price.amount);
    if (variant.price.currencyCode !== getEnv().MARKET_CURRENCY) throw new CommerceError('UNSUPPORTED_CURRENCY', 'This product is unavailable in the selected market.', 409);
    const existing = cart.lines.nodes.filter((line) => line.id !== replaceLine && line.merchandise.id === variant.id).reduce((sum, line) => sum + line.quantity, 0);
    const quantity = existing + component.quantity;
    if (!quantityAllowed(quantity, limit(variant), variant.quantityRule.minimum, variant.quantityRule.increment)) throw new CommerceError('QUANTITY_UNAVAILABLE', 'The requested quantity is unavailable. Refresh your basket to see current stock and limits.', 409);
  }
  return variants;
}

async function mutation(cart: RawCart, name: 'cartLinesAdd' | 'cartLinesUpdate' | 'cartLinesRemove' | 'cartDiscountCodesUpdate', argument: string, variableType: string, value: unknown, ip?: string) {
  const data = await storefront<Record<string, MutationPayload>>(`mutation UpdateCart($country:CountryCode!,$cartId:ID!,$value:${variableType}) @inContext(country:$country) { ${name}(cartId:$cartId,${argument}:$value) { cart { ${CART_FIELDS} } userErrors { code message } warnings { code message } } }`, { cartId: cart.id, value }, ip);
  const payload = data[name];
  const next = payloadCart(payload);
  return publicCart(next, payload.warnings.map((warning) => warning.message));
}

export async function changeCart(action: CartAction, ip?: string) {
  requireLiveCommerce();
  const cookie = await cartCookie();
  // Initial GET creates the session; clients must await it before enabling mutations.
  if (!cookie) throw new CommerceError('SESSION_REQUIRED', 'Refresh your basket to start a secure shopping session.', 409);
  return serial(cookie, async () => {
    const cart = await currentCart(ip);
    if (action.action === 'add' || action.action === 'box') {
      const components = mixedBoxQuantity(action.action === 'box' ? action.components : [{ variantId: action.variantId, quantity: action.quantity }]);
      const fingerprint = createHash('sha256').update(JSON.stringify({ action: action.action, components: [...components].sort((a, b) => a.variantId.localeCompare(b.variantId)) })).digest('hex');
      // Persisted line metadata recovers an uncertain response without adding twice.
      const recovered = cart.lines.nodes.filter((line) => line.attributes.some((attribute) => attribute.key === '_request_id' && attribute.value === action.requestId));
      if (recovered.length) {
        if (recovered.some((line) => line.attributes.find((attribute) => attribute.key === '_request_fingerprint')?.value !== fingerprint)) throw new CommerceError('DUPLICATE_REFERENCE', 'This request reference was already used for different items.', 409);
        return publicCart(cart);
      }
      if (action.action === 'box' && components.reduce((sum, component) => sum + component.quantity, 0) !== settings.mixedBoxSize) throw new CommerceError('BOX_SIZE', `Choose exactly ${settings.mixedBoxSize} bags for your box.`, 400);
      if (cart.lines.nodes.length + components.length > 100) throw new CommerceError('CART_TOO_LARGE', 'Please complete this basket before adding more items.', 409);
      const variants = await validateQuantities(cart, components, undefined, ip);
      if (action.action === 'box' && [...variants.values()].some((variant) => variant.requiresComponents || field(variant.product.category) === 'bundles' || concepts.find((concept) => concept.slug === variant.product.handle)?.isBundle)) throw new CommerceError('BOX_COMPONENT', 'Choose individual flavour bags for a mixed box.', 400);
      const lines = components.map((component) => ({ merchandiseId: component.variantId, quantity: component.quantity, attributes: [{ key: '_request_id', value: action.requestId }, { key: '_request_fingerprint', value: fingerprint }, ...(action.action === 'box' ? [{ key: '_box_group', value: action.requestId }, { key: '_box_size', value: String(settings.mixedBoxSize) }] : [])] }));
      return mutation(cart, 'cartLinesAdd', 'lines', '[CartLineInput!]!', lines, ip);
    }
    if (action.action === 'discount') return mutation(cart, 'cartDiscountCodesUpdate', 'discountCodes', '[String!]!', action.code ? [action.code] : [], ip);
    const line = cart.lines.nodes.find((entry) => entry.id === action.lineId);
    if (!line) return publicCart(cart); // Repeated removal is a successful no-op.
    if (action.action === 'remove' || action.quantity === 0) return mutation(cart, 'cartLinesRemove', 'lineIds', '[ID!]!', [line.id], ip);
    await validateQuantities(cart, [{ variantId: line.merchandise.id, quantity: action.quantity }], line.id, ip);
    return mutation(cart, 'cartLinesUpdate', 'lines', '[CartLineUpdateInput!]!', [{ id: line.id, quantity: action.quantity }], ip);
  });
}

export async function getCheckoutUrl(ip?: string) {
  requireLiveCommerce();
  if (getEnv().SHOPIFY_CHECKOUT_ENABLED !== 'true') throw new CommerceError('CHECKOUT_DISABLED', 'Checkout is awaiting merchant configuration and approval.', 503);
  const id = await cartCookie();
  const cart = id ? await cartById(id, ip) : null;
  if (!cart || !cart.totalQuantity) throw new CommerceError('EMPTY_CART', 'Add a product before checking out.', 400);
  amount(cart.cost.subtotalAmount.amount);
  amount(cart.cost.totalAmount.amount);
  // A fresh provider query is the final availability and price authority.
  const quantities = mixedBoxQuantity(cart.lines.nodes.map((line) => ({ variantId: line.merchandise.id, quantity: line.quantity })));
  await validateQuantities({ ...cart, lines: { nodes: [], pageInfo: { hasNextPage: false } } }, quantities, undefined, ip);
  const groups = new Map<string, number>();
  for (const line of cart.lines.nodes) {
    const group = line.attributes.find((attribute) => attribute.key === '_box_group')?.value;
    if (group) groups.set(group, (groups.get(group) ?? 0) + line.quantity);
  }
  if ([...groups.values()].some((quantity) => quantity !== settings.mixedBoxSize)) throw new CommerceError('BOX_INCOMPLETE', `Each mixed box must contain ${settings.mixedBoxSize} bags. Restore its components or remove the remaining box items.`, 409);
  const url = new URL(cart.checkoutUrl);
  const host = url.hostname;
  const env = getEnv();
  if (url.protocol !== 'https:' || url.username || url.password || !(host === env.SHOPIFY_STORE_DOMAIN || host === 'checkout.shopify.com' || host === 'shop.app' || host === env.SHOPIFY_CHECKOUT_HOST)) throw new CommerceError('INVALID_CHECKOUT', 'The shop returned an unsupported checkout destination.', 502);
  return url.toString();
}
