import { notFound } from 'next/navigation';
import { products as fixtures } from '@/lib/catalogue';
import { getCatalogue, getStoreContent } from '@/lib/catalogue-server';
import { getEnv } from '@/lib/env';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';

export function generateStaticParams() { return fixtures.map((product) => ({ slug: product.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products, mode } = await getCatalogue();
  const product = products.find((product) => product.slug === slug);
  return { title: product?.name ?? 'Flavour not found', description: product?.description, alternates: { canonical: `/products/${slug}` }, openGraph: { images: product ? [{ url: product.image, width: 960, height: 960, alt: product.name }] : [] }, ...(mode === 'development' || !product?.verified ? { robots: { index: false, follow: false } } : {}) };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ products, mode }, content] = await Promise.all([getCatalogue(), getStoreContent()]);
  const product = products.find((product) => product.slug === slug);
  if (!product) notFound();
  const env = getEnv();
  const variants = product.variants.filter((variant) => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(variant.id) && Number.isFinite(variant.price) && variant.price >= 0);
  const site = env.NEXT_PUBLIC_SITE_URL && new URL(env.NEXT_PUBLIC_SITE_URL).protocol === 'https:' ? env.NEXT_PUBLIC_SITE_URL : null;
  // Concepts never emit a Product offer, rating, certification or nutrition claim.
  const structured = mode === 'live' && product.verified && /^gid:\/\/shopify\/Product\/\d+$/.test(product.id) && site && env.SHOPIFY_CHECKOUT_ENABLED === 'true' && variants.length && /^[A-Z]{3}$/.test(product.currencyCode ?? '') ? {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description,
    ...(product.image.startsWith('https://') ? { image: [product.image] } : {}),
    brand: { '@type': 'Brand', name: 'buttersalt' },
    offers: variants.map((variant) => ({ '@type': 'Offer', name: variant.label, url: new URL(`/products/${product.slug}`, site).toString(), priceCurrency: product.currencyCode, price: variant.price.toFixed(2), availability: `https://schema.org/${variant.available && variant.quantityLimit >= (variant.minimum ?? 1) ? 'InStock' : 'OutOfStock'}` })),
  } : null;
  return <>
    {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />}
    <ProductDetail product={product} delivery={content.settings.delivery} />
    <section className="section related"><div className="section-heading"><div><span className="eyebrow">GOOD COMPANY FOR YOUR BAG</span><h2>A little more to love.</h2></div></div><div className="product-grid home-grid">{products.filter((entry) => entry.slug !== slug && !entry.isBundle).slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}</div></section>
  </>;
}
