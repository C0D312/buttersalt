'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { products, type Product, type ProductVariant } from '@/lib/catalogue';
import type { PublicCart } from '@/lib/commerce-types';
import { apiMessage } from '@/lib/browser-errors';

export type Line = { id: string; variantId: string; productSlug: string; title: string; variantTitle: string; quantity: number; price: number; total: number; quantityLimit: number; image: string; available: boolean; attributes?: { key: string; value: string }[] };
type Cart = { lines: Line[]; subtotal: number; total: number; currencyCode: string; totalQuantity: number; discounts?: { code: string; applicable: boolean }[]; warnings?: string[] };
type Basket = { cart: Cart; mode: 'development' | 'live'; open: boolean; setOpen: (value: boolean) => void; busy: boolean; error: string; clearError: () => void; add: (product: Product, variant: ProductVariant, quantity?: number) => Promise<void>; update: (id: string, quantity: number) => Promise<void>; addBox: (components: { product: Product; quantity: number }[]) => Promise<void>; checkout: () => Promise<void>; discount: (code: string) => Promise<void> };
const empty: Cart = { lines: [], subtotal: 0, total: 0, currencyCode: 'AUD', totalQuantity: 0 };
const Context = createContext<Basket | null>(null);
const STORAGE = 'buttersalt-preview-bag';
const PENDING_STORAGE = 'buttersalt-live-pending';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const total = (lines: Line[]): Cart => ({ ...empty, lines, subtotal: lines.reduce((sum, line) => sum + line.total, 0), total: lines.reduce((sum, line) => sum + line.total, 0), totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0) });
const fromProvider = (cart: PublicCart): Cart => ({ ...cart, lines: cart.lines.map((line) => ({ ...line, image: line.image ?? products.find((product) => product.slug === line.productSlug)?.image ?? '/images/family.webp' })) });

function restoredPreview(): Cart {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? '[]');
    if (!Array.isArray(saved)) return empty;
    const merged = new Map<string, Line>();
    const quantities = new Map<string, number>();
    for (const entry of saved.slice(0, 100)) {
      if (!entry || typeof entry !== 'object' || typeof entry.variantId !== 'string' || !Number.isInteger(entry.quantity) || entry.quantity < 1) continue;
      const product = products.find((product) => product.variants.some((variant) => variant.id === entry.variantId));
      const variant = product?.variants.find((variant) => variant.id === entry.variantId);
      if (!product || !variant?.available) continue;
      const group = Array.isArray(entry.attributes) ? entry.attributes.find((attribute: unknown) => attribute && typeof attribute === 'object' && 'key' in attribute && attribute.key === '_box_group' && 'value' in attribute && typeof attribute.value === 'string' && UUID.test(attribute.value))?.value as string | undefined : undefined;
      const quantity = Math.min(entry.quantity, variant.quantityLimit - (quantities.get(variant.id) ?? 0));
      if (quantity <= 0) continue;
      quantities.set(variant.id, (quantities.get(variant.id) ?? 0) + quantity);
      const id = group ? `${variant.id}:${group}` : variant.id;
      const existing = merged.get(id);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      merged.set(id, { id, variantId: variant.id, productSlug: product.slug, title: product.name, variantTitle: group ? 'Mixed box · signature bag' : variant.label, quantity: nextQuantity, price: variant.price, total: nextQuantity * variant.price, quantityLimit: variant.quantityLimit, image: product.image, available: true, ...(group ? { attributes: [{ key: '_box_group', value: group }, { key: '_box_size', value: '6' }] } : {}) });
    }
    return total([...merged.values()]);
  } catch { return empty; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(empty);
  const [mode, setMode] = useState<'development' | 'live'>('development');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const cartRef = useRef<Cart>(empty);
  const modeRef = useRef<'development' | 'live'>('development');
  const readyRef = useRef(false);
  const lock = useRef(false);
  const pending = useRef(new Map<string, string>());
  const commit = useCallback((next: Cart) => { cartRef.current = next; setCart(next); }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    async function initialise() {
      try {
        const response = await fetch('/api/cart', { cache: 'no-store', signal: controller.signal });
        let nextMode: 'development' | 'live';
        let nextCart: Cart;
        if (response.status === 404 || response.status === 405) {
          nextMode = 'development';
          nextCart = restoredPreview();
        } else {
          const data = await response.json();
          if (!response.ok) throw new Error(apiMessage(data, 'Your basket could not connect. Reload the page to try again.'));
          if (data.mode === 'live' && data.cart) { nextMode = 'live'; nextCart = fromProvider(data.cart); }
          else if (data.mode === 'development') { nextMode = 'development'; nextCart = restoredPreview(); }
          else throw new Error('The basket service returned an unexpected response. Reload the page to try again.');
        }
        if (!active) return;
        if (nextMode === 'live') {
          try {
            const saved: unknown = JSON.parse(sessionStorage.getItem(PENDING_STORAGE) ?? '[]');
            if (Array.isArray(saved)) for (const entry of saved.slice(0, 100)) if (Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string' && UUID.test(entry[1])) pending.current.set(entry[0], entry[1]);
          } catch { /* Optional recovery cache; the server cookie still persists. */ }
        }
        modeRef.current = nextMode;
        readyRef.current = true;
        setMode(nextMode);
        commit(nextCart);
        setReady(true);
      } catch {
        if (active) setError('Your basket could not connect. Reload the page to try again. Your existing basket has been kept.');
      } finally { window.clearTimeout(timeout); if (active) setBusy(false); }
    }
    void initialise();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [commit]);

  useEffect(() => {
    if (!ready || mode !== 'development') return;
    try { localStorage.setItem(STORAGE, JSON.stringify(cart.lines.map((line) => ({ id: line.id, variantId: line.variantId, quantity: line.quantity, attributes: line.attributes })))); }
    catch { /* Browser storage may be denied/full; the current basket still works. */ }
  }, [cart, ready, mode]);

  function connected() {
    if (!readyRef.current) { setError('Your basket is still connecting. Reload the page if this continues.'); setOpen(true); return false; }
    return !lock.current;
  }
  function savePending() {
    try { sessionStorage.setItem(PENDING_STORAGE, JSON.stringify([...pending.current.entries()])); } catch { /* No secret cart ID is stored here. */ }
  }
  const mutate = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    if (!readyRef.current || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    const signature = JSON.stringify(body);
    const requestId = pending.current.get(signature) ?? crypto.randomUUID();
    pending.current.set(signature, requestId);
    savePending();
    try {
      const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, requestId }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) { pending.current.delete(signature); savePending(); }
        throw new Error(apiMessage(data, 'Your basket could not be updated. Please try again.'));
      }
      if (!data.cart) throw new Error('The basket update could not be confirmed. Please retry the same action.');
      commit(fromProvider(data.cart));
      pending.current.delete(signature);
      savePending();
      const messages: string[] = data.cart.warnings ?? [];
      if (messages.length) setError(messages.join(' '));
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Connection interrupted. Retry the same action; your basket has been kept.';
      try {
        const response = await fetch('/api/cart', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.mode === 'live' && data.cart) commit(fromProvider(data.cart));
        }
      } catch { /* Preserve the last known basket if recovery also fails. */ }
      setError(message);
      return false;
    } finally { setBusy(false); lock.current = false; }
  }, [commit]);

  async function add(product: Product, variant: ProductVariant, quantity = 1) {
    if (!connected()) return;
    setError('');
    if (modeRef.current === 'live') { await mutate({ action: 'add', variantId: variant.id, quantity }); }
    else {
      const inBasket = cartRef.current.lines.filter((line) => line.variantId === variant.id).reduce((sum, line) => sum + line.quantity, 0);
      if (!variant.available || !Number.isInteger(quantity) || quantity < 1 || inBasket + quantity > variant.quantityLimit) { setError('This quantity is unavailable. The limit includes bags already in your basket and mixed boxes.'); setOpen(true); return; }
      const standalone = cartRef.current.lines.find((line) => line.id === variant.id);
      const nextQuantity = (standalone?.quantity ?? 0) + quantity;
      commit(total([...cartRef.current.lines.filter((line) => line.id !== variant.id), { id: variant.id, variantId: variant.id, productSlug: product.slug, title: product.name, variantTitle: variant.label, quantity: nextQuantity, price: variant.price, total: nextQuantity * variant.price, quantityLimit: variant.quantityLimit, image: product.image, available: true }]));
    }
    setOpen(true);
  }

  async function update(id: string, quantity: number) {
    if (!connected()) return;
    setError('');
    if (modeRef.current === 'live') { await mutate({ action: quantity === 0 ? 'remove' : 'update', lineId: id, ...(quantity === 0 ? {} : { quantity }) }); return; }
    const current = cartRef.current.lines.find((line) => line.id === id);
    if (!current) return;
    const elsewhere = cartRef.current.lines.filter((line) => line.id !== id && line.variantId === current.variantId).reduce((sum, line) => sum + line.quantity, 0);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity + elsewhere > current.quantityLimit) { setError('This quantity exceeds the limit across your basket and mixed boxes.'); return; }
    commit(total(cartRef.current.lines.flatMap((line) => line.id !== id ? [line] : quantity === 0 ? [] : [{ ...line, quantity, total: quantity * line.price }])));
  }

  async function addBox(components: { product: Product; quantity: number }[]) {
    if (!connected()) return;
    setError('');
    if (components.some((component) => !Number.isInteger(component.quantity) || component.quantity < 1 || component.product.isBundle) || components.reduce((sum, component) => sum + component.quantity, 0) !== 6) { setError('Choose exactly six individual flavour bags to complete your box.'); setOpen(true); return; }
    if (modeRef.current === 'live') { await mutate({ action: 'box', components: components.map((component) => ({ variantId: component.product.variants[0].id, quantity: component.quantity })) }); }
    else {
      const merged = new Map<string, { product: Product; quantity: number }>();
      for (const component of components) { const id = component.product.variants[0].id; merged.set(id, { product: component.product, quantity: (merged.get(id)?.quantity ?? 0) + component.quantity }); }
      for (const [id, component] of merged) {
        const variant = component.product.variants[0];
        const existing = cartRef.current.lines.filter((line) => line.variantId === id).reduce((sum, line) => sum + line.quantity, 0);
        if (!variant.available || existing + component.quantity > variant.quantityLimit) { setError('A selected flavour exceeds the available quantity across your basket. Adjust the box or your existing bags.'); setOpen(true); return; }
      }
      const group = crypto.randomUUID();
      commit(total([...cartRef.current.lines, ...[...merged.values()].map(({ product, quantity }) => {
        const variant = product.variants[0];
        return { id: `${variant.id}:${group}`, variantId: variant.id, productSlug: product.slug, title: product.name, variantTitle: 'Mixed box · signature bag', quantity, price: variant.price, total: quantity * variant.price, quantityLimit: variant.quantityLimit, image: product.image, available: true, attributes: [{ key: '_box_group', value: group }, { key: '_box_size', value: '6' }] };
      })]));
    }
    setOpen(true);
  }

  async function checkout() {
    if (!connected()) return;
    if (modeRef.current !== 'live') { setError('This is a development preview. Checkout opens after products and Shopify are confirmed.'); return; }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await response.json();
      if (!response.ok) throw new Error(apiMessage(data, 'Checkout is unavailable. Please retry.'));
      if (typeof data.checkoutUrl !== 'string') throw new Error('The checkout destination could not be confirmed.');
      const url = new URL(data.checkoutUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid checkout destination.');
      window.location.assign(url.href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open checkout. Please retry.'); }
    finally { setBusy(false); lock.current = false; }
  }

  async function discount(code: string) {
    if (!connected()) return;
    if (modeRef.current === 'development') { setError('Discounts are validated by Shopify when the store is connected.'); return; }
    if (await mutate({ action: 'discount', code })) {
      const result = cartRef.current.discounts?.find((discount) => discount.code.toLowerCase() === code.trim().toLowerCase());
      if (code && !result?.applicable) setError('This discount code does not apply to your current basket.');
    }
  }

  return <Context.Provider value={{ cart, mode, open, setOpen, busy, error, clearError: () => setError(''), add, update, addBox, checkout, discount }}>{children}</Context.Provider>;
}
export function useCart() { const context = useContext(Context); if (!context) throw new Error('CartProvider missing'); return context; }
