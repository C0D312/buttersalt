export type Money = { amount: string; currencyCode: string };
export type Attribute = { key: string; value: string };
export type PublicCartLine = {
  id: string;
  variantId: string;
  productSlug: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  total: number;
  available: boolean;
  quantityLimit: number;
  minimum?: number;
  increment?: number;
  image: string | null;
  attributes: Attribute[];
};
/** Deliberately excludes the sensitive Shopify cart ID and checkout URL. */
export type PublicCart = {
  lines: PublicCartLine[];
  subtotal: number;
  total: number;
  discounts: { code: string; applicable: boolean }[];
  currencyCode: string;
  totalQuantity: number;
  taxEstimated: boolean;
  shippingEstimated: boolean;
  warnings: string[];
};
