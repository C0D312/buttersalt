import type { MetadataRoute } from 'next';
import { getCatalogue } from '@/lib/catalogue-server';

// Private static exports return an empty sitemap without fetching. For a live
// store, getCatalogue uses no-store, making this route fresh on every request.
export const dynamic = 'auto';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.INDEXING_ENABLED !== 'true') return [];
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return [];
  let site: URL;
  try { site = new URL(origin); } catch { return []; }
  if (site.protocol !== 'https:') return [];
  const { mode, products } = await getCatalogue();
  if (mode !== 'live') return [];
  const routes = ['', '/shop', '/bundles', '/gifts', '/about', '/faq', '/contact', '/build-a-box', '/collections/sweet', '/collections/savoury', '/shipping', '/returns', '/privacy', '/terms', ...products.filter((product) => product.verified).map((product) => `/products/${encodeURIComponent(product.slug)}`)];
  return [...new Set(routes)].map((route) => ({ url: new URL(route || '/', site).toString() }));
}
