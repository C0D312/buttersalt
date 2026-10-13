export const widths = [320, 375, 390, 430, 768, 1024, 1440] as const;

export const flavourSlugs = [
  'original-butter-sea-salt',
  'sweet-salty',
  'salted-caramel',
  'cheddar-cheese',
  'chocolate-drizzle',
  'chilli-lime',
  'truffle-parmesan',
  'cinnamon-sugar',
] as const;

export const routes = [
  '/', '/shop', '/collections/sweet', '/collections/savoury',
  ...flavourSlugs.map((slug) => `/products/${slug}`),
  '/products/discovery-box', '/products/mixed-box', '/products/gift-box',
  '/bundles', '/build-a-box', '/gifts', '/about', '/faq', '/contact',
  '/cart', '/checkout', '/account', '/shipping', '/returns', '/privacy', '/terms',
] as const;

export const screenshotRoutes = {
  home: '/',
  shop: '/shop',
  product: '/products/salted-caramel',
  builder: '/build-a-box',
  cart: '/cart',
};
