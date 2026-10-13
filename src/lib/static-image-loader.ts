import type { ImageLoaderProps } from 'next/image';

const flavours = new Set([
  'original-butter-sea-salt', 'sweet-salty', 'salted-caramel', 'cheddar-cheese',
  'chocolate-drizzle', 'chilli-lime', 'truffle-parmesan', 'cinnamon-sugar',
]);
const boxes = new Set(['discovery-box', 'mixed-box', 'gift-box']);
const campaigns = new Set(['hero', 'family', 'lifestyle']);

/** Use retained responsive exports on the static preview; full Next uses its normal optimiser. */
export default function staticImageLoader({ src, width }: ImageLoaderProps): string {
  const match = src.match(/^\/images\/([a-z0-9-]+)\.webp([?#].*)?$/);
  if (!match) return src;
  const [, name, suffix = ''] = match;
  if (width <= 640 && campaigns.has(name)) return '/images/' + name + '-640.webp' + suffix;
  if (name.endsWith('-closeup') && boxes.has(name.slice(0, -8))) {
    return width <= 640 ? '/images/family-640.webp' + suffix : src;
  }
  const kind = name.endsWith('-bag') ? '-bag' : name.endsWith('-closeup') ? '-closeup' : '';
  const slug = kind ? name.slice(0, -kind.length) : '';
  if (width <= 480 && (flavours.has(slug) || (kind === '-bag' && boxes.has(slug)))) {
    return '/images/' + name + '-480.webp' + suffix;
  }
  return src;
}
