'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { type Product, formatPrice } from '@/lib/catalogue';
import { settings } from '@/lib/content';
import { useCart } from './cart-provider';
import { Icon } from './icons';

export function ProductDetail({ product: p, delivery = settings.delivery }: { product: Product; delivery?: string }) {
  const initial = p.variants.find((variant) => variant.available) ?? p.variants[0];
  const [variantId, setVariantId] = useState(initial?.id ?? '');
  const [requestedQuantity, setQuantity] = useState(initial?.minimum ?? 1);
  const [photo, setPhoto] = useState(0);
  const { add, busy, mode } = useCart();
  const variant = p.variants.find((candidate) => candidate.id === variantId) ?? initial;
  const minimum = variant?.minimum && Number.isInteger(variant.minimum) && variant.minimum > 0 ? variant.minimum : 1;
  const increment = variant?.increment && Number.isInteger(variant.increment) && variant.increment > 0 ? variant.increment : 1;
  const maximum = variant?.quantityLimit ?? 0;
  const quantity = minimum + Math.floor((Math.max(minimum, Math.min(requestedQuantity, Math.max(minimum, maximum))) - minimum) / increment) * increment;
  const development = mode === 'development' && !p.id.startsWith('gid://shopify/Product/');
  const available = Boolean(variant?.available && maximum >= minimum && (development || p.verified));
  const price = variant && Number.isFinite(variant.price) && variant.price >= 0 ? formatPrice(variant.price, p.currencyCode) : 'Unavailable';
  function chooseVariant(id: string) {
    const next = p.variants.find((candidate) => candidate.id === id);
    setVariantId(id);
    setQuantity(next?.minimum ?? 1);
  }
  return <section className="product-detail section">
    <div className="product-gallery">
      <div className="main-product-image" style={{ background: p.colour }}>
        <Image src={photo === 0 ? p.image : p.closeup} alt={photo === 0 ? `${p.name}${p.verified ? '' : ' concept'} packaging` : `${p.name}${p.verified ? '' : ' concept'} popcorn close-up`} width={900} height={900} priority fetchPriority="high" sizes="(max-width: 768px) calc(100vw - 40px), 55vw" />
        {!p.verified && <span className="concept-chip">CONCEPT VISUALISATION</span>}
      </div>
      <div className="gallery-thumbs"><button className={photo === 0 ? 'selected' : ''} onClick={() => setPhoto(0)} aria-label="View packaging" aria-pressed={photo === 0}><Image src={p.image} width={90} height={90} alt="Packaging" /></button><button className={photo === 1 ? 'selected' : ''} onClick={() => setPhoto(1)} aria-label="View popcorn detail" aria-pressed={photo === 1}><Image src={p.closeup} width={90} height={90} alt="Popcorn detail" /></button><p>A little closer.<br />A lot more delicious.</p></div>
    </div>
    <div className="product-copy">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/shop">Popcorn</Link><span>/</span><Link href={p.isBundle ? '/bundles' : `/collections/${p.category}`}>{p.isBundle ? 'Boxes & bundles' : p.category}</Link></nav>
      <span className="eyebrow">{p.isBundle ? 'GOOD THINGS, TOGETHER' : p.category === 'sweet' ? 'YOUR SWEET SIDE' : 'A LITTLE SAVOURY JOY'}</span>
      <h1>{p.shortName}</h1><p className="product-note">{p.note}</p>
      <div className="detail-price">{price}<span>{development ? 'Illustrative AUD price' : p.packSize ?? 'Pack information awaiting confirmation'}</span></div>
      <p className="detail-description">{p.description}</p>
      <label className="variant-label" htmlFor="product-variant">Choose your {p.isBundle ? 'box' : 'bag'}</label>
      <div className="select-wrapper"><select id="product-variant" value={variant?.id ?? ''} onChange={(event) => chooseVariant(event.target.value)} disabled={busy || !p.variants.length}>{p.variants.length ? p.variants.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={!candidate.available}>{candidate.label} · {Number.isFinite(candidate.price) ? formatPrice(candidate.price, p.currencyCode) : 'Unavailable'}{!candidate.available ? ' · unavailable' : ''}</option>) : <option value="">No available variants</option>}</select><Icon name="chevron" /></div>
      <div className="purchase-row">
        <div className="quantity"><button aria-label="Decrease quantity" disabled={busy || !available || quantity - increment < minimum} onClick={() => setQuantity(quantity - increment)}><Icon name="minus" /></button><span aria-live="polite">{quantity}</span><button aria-label="Increase quantity" disabled={busy || !available || quantity + increment > maximum} onClick={() => setQuantity(quantity + increment)}><Icon name="plus" /></button></div>
        {p.slug === 'mixed-box' ? <Link className="button" href="/build-a-box">Build your box<Icon name="arrow" /></Link> : <button className="button" disabled={busy || !available} onClick={() => { if (variant) void add(p, variant, quantity); }}>{!available ? 'Currently unavailable' : busy ? 'Adding…' : 'Add to bag'}<Icon name="plus" /></button>}
      </div>
      <p className="availability">{development ? 'Try the preview bag · not available for live sale' : available ? 'Available' : 'Unavailable'}</p>
      <div className="detail-accordions">
        <details open><summary>Flavour notes<Icon name="plus" /></summary><p>{p.note} {p.description}</p></details>
        <details><summary>Ingredients & allergens<Icon name="plus" /></summary><p>{p.ingredients ?? 'Ingredients are awaiting confirmation.'}</p><p>{p.allergens ?? 'Allergens are awaiting confirmation. Please do not use flavour names or concept images to make dietary decisions.'}</p></details>
        <details><summary>Nutrition & pack information<Icon name="plus" /></summary><p>{p.nutrition ?? 'Verified nutrition information will be published before launch.'}</p><p>{p.packSize ?? 'Pack sizes and weights are being confirmed.'}{p.weight ? ` · ${p.weight}` : ''}</p></details>
        <details><summary>Delivery & returns<Icon name="plus" /></summary><p>{delivery}</p><Link className="text-link" href="/shipping">Delivery information</Link><span> · </span><Link className="text-link" href="/returns">Returns</Link></details>
      </div>
    </div>
  </section>;
}
