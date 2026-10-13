/** Offline by default. Node 22.18+ supports the typed catalogue module. */
import { products } from '../src/lib/catalogue.ts';

const apiVersion = '2026-10';
const text = (key, value, type = 'single_line_text_field') => ({ namespace: 'buttersalt', key, type, value: String(value) });
const plans = products.map((product) => ({
  title: product.name, handle: product.slug, vendor: 'buttersalt', status: 'DRAFT', productType: product.category,
  descriptionHtml: `<p>${product.description.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p><p>Development concept. Food information, sizes and commercial details require confirmation.</p>`,
  tags: ['buttersalt', 'development-concept'],
  metafields: [text('food_verified', false, 'boolean'), text('category', product.category), text('short_name', product.shortName), text('colour', product.colour), text('accent', product.accent), text('note', product.note), text('concept_price_aud', product.price, 'number_decimal')],
}));

if (!process.argv.includes('--apply')) {
  process.stdout.write(JSON.stringify({ mode: 'plan', apiVersion, notice: 'Draft creation only. Existing handles are always skipped. Prices and inventory require owner confirmation in Admin.', products: plans }, null, 2) + '\n');
} else {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const confirmedDomain = process.argv[process.argv.indexOf('--store') + 1];
  if (!domain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) || !token || token.length < 16 || confirmedDomain !== domain) throw new Error('Set SHOPIFY_STORE_DOMAIN and a least-privilege SHOPIFY_ADMIN_ACCESS_TOKEN, then supply --store with the same domain.');
  async function admin(query, variables) {
    const response = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`Shopify Admin request failed (${response.status}). Rerun to safely skip products already created.`);
    const envelope = await response.json();
    if (envelope.errors?.length || !envelope.data) throw new Error('Shopify Admin rejected the request. Check app access scopes and API compatibility.');
    return envelope.data;
  }
  for (const product of plans) {
    const existing = await admin('query Existing($query:String!) { products(first:10,query:$query) { nodes { id handle } } }', { query: `handle:${product.handle}` });
    if (existing.products.nodes.some((node) => node.handle === product.handle)) {
      process.stdout.write(`Skipped existing handle: ${product.handle}\n`);
      continue;
    }
    // Never update an existing resource. Shopify creates a default variant; its
    // price remains unset/zero and this DRAFT is not published to any channel.
    const created = await admin('mutation Draft($product:ProductCreateInput!) { productCreate(product:$product) { product { id handle status } userErrors { message } } }', { product });
    if (created.productCreate.userErrors.length || !created.productCreate.product) throw new Error(`Draft creation rejected for ${product.handle}. Review the Admin app configuration.`);
    if (created.productCreate.product.handle !== product.handle) throw new Error(`A concurrent process used ${product.handle}. Shopify returned another handle; stop and review that draft in Admin.`);
    process.stdout.write(`Created draft: ${product.handle}\n`);
  }
  process.stdout.write('Draft import complete. Nothing was published. Confirm real food data, variants, prices, inventory and photography in Shopify Admin.\n');
}
