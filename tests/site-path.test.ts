import { afterEach, describe, expect, it, vi } from 'vitest';
import staticImageLoader from '../src/lib/static-image-loader';
import { sitePath } from '../src/lib/site-path';

afterEach(() => vi.unstubAllEnvs());

describe('static preview hosting paths', () => {
  it('keeps root hosting and its responsive assets unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    expect(sitePath('/brand/favicon.svg')).toBe('/brand/favicon.svg');
    expect(staticImageLoader({ src: '/images/hero.webp', width: 640 })).toBe('/images/hero-640.webp');
  });

  it('prefixes SVG and full-size files without duplicating a subpath', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/buttersalt');
    expect(staticImageLoader({ src: '/brand/wordmark-dark.svg', width: 190 })).toBe('/buttersalt/brand/wordmark-dark.svg');
    expect(staticImageLoader({ src: '/images/hero.webp', width: 1920 })).toBe('/buttersalt/images/hero.webp');
    expect(sitePath('/buttersalt/brand/favicon.svg')).toBe('/buttersalt/brand/favicon.svg');
    expect(sitePath('/buttersalt?x=1')).toBe('/buttersalt?x=1');
    expect(sitePath('/buttersalt-extra/image.webp')).toBe('/buttersalt/buttersalt-extra/image.webp');
  });

  it('selects responsive images for prefixed or unprefixed source paths', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/buttersalt');
    expect(staticImageLoader({ src: '/buttersalt/images/hero.webp', width: 640 })).toBe('/buttersalt/images/hero-640.webp');
    expect(staticImageLoader({ src: '/images/salted-caramel-bag.webp?v=1', width: 480 })).toBe('/buttersalt/images/salted-caramel-bag-480.webp?v=1');
    expect(staticImageLoader({ src: '/images/mixed-box-closeup.webp', width: 640 })).toBe('/buttersalt/images/family-640.webp');
  });

  it('preserves external and embedded image sources', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/buttersalt');
    for (const src of ['https://cdn.shopify.com/image.webp', '//cdn.shopify.com/image.webp', 'data:image/png;base64,aGVsbG8=', 'blob:https://example.com/id']) {
      expect(sitePath(src)).toBe(src);
      expect(staticImageLoader({ src, width: 480 })).toBe(src);
    }
  });
});
