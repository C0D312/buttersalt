import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const catalogue = vi.hoisted(() => vi.fn());
vi.mock('@/lib/catalogue-server', () => ({ getCatalogue: catalogue }));
import sitemap from '../src/app/sitemap';

describe('approved public sitemap', () => {
  beforeEach(() => {
    catalogue.mockReset();
    vi.stubEnv('INDEXING_ENABLED', 'false');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://buttersalt.example');
  });
  afterEach(() => { vi.unstubAllEnvs(); });
  it('keeps private previews empty and makes no merchant request', async () => {
    expect(await sitemap()).toEqual([]);
    expect(catalogue).not.toHaveBeenCalled();
  });
  it('requires an approved HTTPS origin before fetching the catalogue', async () => {
    vi.stubEnv('INDEXING_ENABLED', 'true');
    for (const origin of ['', 'undefined', 'http://127.0.0.1:3000']) {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
      expect(await sitemap()).toEqual([]);
    }
    expect(catalogue).not.toHaveBeenCalled();
  });
  it('excludes a development catalogue even if indexing was accidentally enabled', async () => {
    vi.stubEnv('INDEXING_ENABLED', 'true');
    catalogue.mockResolvedValue({ mode: 'development', products: [{ slug: 'concept', verified: true }] });
    expect(await sitemap()).toEqual([]);
  });
  it('includes real approved Shopify products and excludes unapproved concepts and private routes', async () => {
    vi.stubEnv('INDEXING_ENABLED', 'true');
    catalogue.mockResolvedValue({ mode: 'live', products: [{ slug: 'confirmed-flavour', verified: true }, { slug: 'unconfirmed-flavour', verified: false }] });
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain('https://buttersalt.example/products/confirmed-flavour');
    expect(urls).not.toContain('https://buttersalt.example/products/unconfirmed-flavour');
    expect(urls).toContain('https://buttersalt.example/collections/sweet');
    expect(urls).toContain('https://buttersalt.example/privacy');
    for (const route of ['/cart', '/checkout', '/account', '/api/cart']) expect(urls).not.toContain(`https://buttersalt.example${route}`);
  });
  it('does not keep a process-local stale copy when the provider catalogue changes', async () => {
    vi.stubEnv('INDEXING_ENABLED', 'true');
    catalogue.mockResolvedValueOnce({ mode: 'live', products: [{ slug: 'first', verified: true }] });
    catalogue.mockResolvedValueOnce({ mode: 'live', products: [{ slug: 'newly-published', verified: true }] });
    const first = (await sitemap()).map((entry) => entry.url);
    const next = (await sitemap()).map((entry) => entry.url);
    expect(first).toContain('https://buttersalt.example/products/first');
    expect(next).toContain('https://buttersalt.example/products/newly-published');
    expect(next).not.toContain('https://buttersalt.example/products/first');
    expect(catalogue).toHaveBeenCalledTimes(2);
  });
});
