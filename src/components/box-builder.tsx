'use client';
import { useState } from 'react';
import Image from 'next/image';
import { formatPrice, type Product } from '@/lib/catalogue';
import { useCart } from './cart-provider';
import { Icon } from './icons';

export function BoxBuilder({ products }: { products: Product[] }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { addBox, busy, mode, cart } = useCart();
  const selected = products.flatMap((product) => Array.from({ length: counts[product.id] ?? 0 }, () => product));
  const count = selected.length;
  const price = selected.reduce((sum, product) => sum + (product.variants[0]?.price ?? 0), 0);
  const development = mode === 'development' && !products.some((product) => product.id.startsWith('gid://shopify/Product/'));
  const currency = products.find((product) => product.variants.length)?.currencyCode ?? cart.currencyCode;
  function inBasket(id: string) { return cart.lines.filter((line) => line.variantId === id).reduce((sum, line) => sum + line.quantity, 0); }
  function available(product: Product) { const variant = product.variants[0]; return Boolean(variant?.available && !product.isBundle && (development || product.verified) && (variant.minimum ?? 1) <= variant.quantityLimit); }
  function nextQuantity(product: Product, direction: number) {
    const variant = product.variants[0];
    const current = counts[product.id] ?? 0;
    if (!variant) return 0;
    const minimum = variant.minimum ?? 1;
    const increment = variant.increment ?? 1;
    if (direction < 0) return current <= minimum ? 0 : Math.max(minimum, current - increment);
    return current === 0 ? minimum : current + increment;
  }
  function canAdd(product: Product) {
    const variant = product.variants[0];
    if (!variant) return false;
    const next = nextQuantity(product, 1);
    return !busy && available(product) && count - (counts[product.id] ?? 0) + next <= 6 && next + inBasket(variant.id) <= variant.quantityLimit;
  }
  function change(product: Product, direction: number) {
    if (direction > 0 && !canAdd(product)) return;
    setCounts((current) => ({ ...current, [product.id]: nextQuantity(product, direction) }));
  }
  const boxAvailable = count === 6 && products.filter((product) => counts[product.id] > 0).every((product) => available(product) && counts[product.id] + inBasket(product.variants[0].id) <= product.variants[0].quantityLimit);
  return <section className="builder-layout section">
    <div className="builder-flavours">{products.length ? products.map((product) => <article className="builder-card" key={product.id}>
      <div className="builder-image" style={{ background: product.colour }}><Image src={product.image} width={400} height={400} sizes="(max-width: 600px) 45vw, 25vw" alt={`${product.name}${product.verified ? '' : ' concept'} bag`} /></div>
      <div className="builder-card-copy"><h2>{product.shortName}</h2><span>{product.variants[0] ? formatPrice(product.variants[0].price, product.currencyCode) : 'Unavailable'}</span><div className="builder-quantity"><button className="icon-button" aria-label={`Remove ${product.shortName} from box`} onClick={() => change(product, -1)} disabled={busy || !counts[product.id]}><Icon name="minus" /></button><span aria-live="polite">{counts[product.id] ?? 0}</span><button className="icon-button" aria-label={`Add ${product.shortName} to box`} onClick={() => change(product, 1)} disabled={!canAdd(product)}><Icon name="plus" /></button></div></div>
    </article>) : <div className="empty-state"><h2>The box is waiting.</h2><p>Individual flavours will appear here when the merchant publishes the confirmed range.</p></div>}</div>
    <aside className="box-summary"><span className="eyebrow">YOUR OWN LITTLE COLLECTION</span><h2>Six bags.<br />Your rules.</h2><p>Sweet, savoury, or gloriously indecisive. Pick your six.</p>
      <div className="box-slots" aria-label={`${count} of 6 bags selected`}>{Array.from({ length: 6 }, (_, index) => selected[index] ? <div className="box-slot filled" key={index} style={{ background: selected[index].colour }}><Image src={selected[index].image} width={140} height={140} alt={selected[index].shortName} /></div> : <div className="box-slot" key={index}><span>{index + 1}</span></div>)}</div>
      <div className="box-progress"><span aria-live="polite">{count} / 6 selected</span><button className="text-link" onClick={() => setCounts({})} disabled={count === 0 || busy}>Start again</button></div><div className="progress-track"><span style={{ width: `${count / 6 * 100}%` }} /></div>
      <div className="subtotal"><span>{development ? 'Illustrative box total' : 'Box subtotal'}</span><strong>{formatPrice(price, currency)}</strong></div>
      <button className="button full" disabled={!boxAvailable || busy} onClick={() => void addBox(products.filter((product) => counts[product.id] > 0).map((product) => ({ product, quantity: counts[product.id] })))}>{count === 6 ? 'Add mixed box to bag' : `Choose ${6 - count} more ${6 - count === 1 ? 'bag' : 'bags'}`}<Icon name="arrow" /></button>
      <p className="fineprint">{development ? 'Each selected bag is represented as an inventory-tracked component in live Shopify orders. No payment is taken in this preview.' : 'Your box contains six real flavour bags, grouped together for fulfilment. Stock, prices and any eligible discounts are checked by Shopify before payment.'}</p>
    </aside>
  </section>;
}
