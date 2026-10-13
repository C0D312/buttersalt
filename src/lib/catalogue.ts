/** Development concepts only. Shopify is authoritative when commerce is configured. */
export type ProductCategory = 'sweet' | 'savoury' | 'bundles';
export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  available: boolean;
  quantityLimit: number;
  minimum?: number;
  increment?: number;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  colour: string;
  accent: string;
  description: string;
  note: string;
  price: number;
  image: string;
  closeup: string;
  variants: ProductVariant[];
  verified: boolean;
  ingredients: string | null;
  allergens: string | null;
  nutrition: string | null;
  isBundle?: boolean;
  currencyCode?: string;
  packSize?: string | null;
  weight?: string | null;
};

type Concept = Pick<Product, 'slug' | 'name' | 'shortName' | 'category' | 'colour' | 'accent' | 'description' | 'note' | 'price'> & { isBundle?: boolean };
const concepts: Concept[] = [
  { slug: 'original-butter-sea-salt', name: 'Original Butter & Sea Salt', shortName: 'Butter & Sea Salt', category: 'savoury', colour: '#F6CD45', accent: '#3D3A16', description: 'The familiar favourite, reimagined. A mellow buttery flavour meets a bright touch of sea salt and a satisfying crunch.', note: 'Butter. Salt. Beautifully simple.', price: 9.5 },
  { slug: 'sweet-salty', name: 'Sweet & Salty', shortName: 'Sweet & Salty', category: 'sweet', colour: '#E9A9A5', accent: '#6A252F', description: 'A little sweetness, a little salt. An easy-going combination that keeps every handful interesting.', note: 'A delicious balancing act.', price: 9.5 },
  { slug: 'salted-caramel', name: 'Salted Caramel', shortName: 'Salted Caramel', category: 'sweet', colour: '#C97B43', accent: '#60361B', description: 'Deep caramel flavour with a savoury edge. Golden, glossy and made for your next slow moment.', note: 'Golden hour, by the handful.', price: 11 },
  { slug: 'cheddar-cheese', name: 'Cheddar Cheese', shortName: 'Cheddar Cheese', category: 'savoury', colour: '#325EC9', accent: '#FFFFFF', description: 'Bold cheddar flavour and an irresistible savoury finish. Bring a little extra personality to snack time.', note: 'A big, bold cheese moment.', price: 10.5 },
  { slug: 'chocolate-drizzle', name: 'Chocolate Drizzle', shortName: 'Chocolate Drizzle', category: 'sweet', colour: '#793947', accent: '#FFF0D6', description: 'A cocoa-rich chocolate flavour woven through crisp popcorn. Sweet, indulgent and a pleasure to share.', note: 'For the chocolate people.', price: 12 },
  { slug: 'chilli-lime', name: 'Chilli Lime', shortName: 'Chilli Lime', category: 'savoury', colour: '#55734F', accent: '#FFF0D6', description: 'A warm chilli note with a lively citrus finish. A bright little twist on your usual savoury handful.', note: 'A little heat. A little zing.', price: 10.5 },
  { slug: 'truffle-parmesan', name: 'Truffle Parmesan', shortName: 'Truffle Parmesan', category: 'savoury', colour: '#B8A8D4', accent: '#352A1F', description: 'Earthy truffle flavour meets a rounded parmesan note. A savoury combination for evenings worth lingering over.', note: 'Your savoury side, dressed up.', price: 12 },
  { slug: 'cinnamon-sugar', name: 'Cinnamon Sugar', shortName: 'Cinnamon Sugar', category: 'sweet', colour: '#C48E83', accent: '#5C3229', description: 'Soft cinnamon warmth and a sweet finish, with plenty of crunch. A comforting flavour for cosy corners.', note: 'A little comfort. A lot of crunch.', price: 10.5 },
  { slug: 'discovery-box', name: 'The Discovery Box', shortName: 'Discovery Box', category: 'bundles', colour: '#F6CD45', accent: '#352A1F', description: 'Meet the entire flavour family. Eight different concepts, gathered into one generously curious box.', note: 'Eight flavours. One happy discovery.', price: 79, isBundle: true },
  { slug: 'mixed-box', name: 'Your Mixed Box', shortName: 'Mixed Box', category: 'bundles', colour: '#AFC8CE', accent: '#233D44', description: 'Choose six bags from the flavour family and make it your own. Sweet, savoury or a little of everything.', note: 'Six bags. Entirely your taste.', price: 57, isBundle: true },
  { slug: 'gift-box', name: 'The Good Taste Gift Box', shortName: 'Gift Box', category: 'bundles', colour: '#D4B5D1', accent: '#50374F', description: 'A considered little collection for someone with good taste. A beautiful way to say thanks, hello or thinking of you.', note: 'Good taste makes a lovely gift.', price: 49, isBundle: true },
];

export const products: Product[] = concepts.map((product) => ({
  ...product,
  id: `concept:${product.slug}`,
  image: `/images/${product.slug}-bag.webp`,
  closeup: `/images/${product.slug}-closeup.webp`,
  verified: false,
  ingredients: null,
  allergens: null,
  nutrition: null,
  packSize: null,
  weight: null,
  currencyCode: 'AUD',
  variants: product.isBundle
    ? [{ id: `concept:${product.slug}:box`, label: 'Concept box · contents to confirm', price: product.price, available: true, quantityLimit: 4 }]
    : [
      { id: `concept:${product.slug}:signature`, label: 'Signature bag · size to confirm', price: product.price, available: true, quantityLimit: 12 },
      { id: `concept:${product.slug}:sharing`, label: 'Sharing bag · size to confirm', price: Number((product.price * 1.8).toFixed(2)), available: true, quantityLimit: 12 },
    ],
}));
export const flavours = products.filter((product) => !product.isBundle);
export const bundles = products.filter((product) => product.isBundle);
export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
export const formatPrice = (amount: number, currency = 'AUD') => new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);

