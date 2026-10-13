import 'server-only';
import { z } from 'zod';

export const SHOPIFY_API_VERSION = '2026-10';
const optional = (schema: z.ZodType<string>) => z.preprocess((value) => value === '' ? undefined : value, schema.optional());
const envSchema = z.object({
  COMMERCE_MODE: z.enum(['development', 'live']).default('development'),
  SHOPIFY_STORE_DOMAIN: optional(z.string().regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/)),
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: optional(z.string().min(16)),
  SHOPIFY_CHECKOUT_ENABLED: z.enum(['true', 'false']).default('false'),
  SHOPIFY_CHECKOUT_HOST: optional(z.string().regex(/^[a-z0-9.-]+$/)),
  SHOPIFY_CUSTOMER_ACCOUNT_URL: optional(z.string().url().refine((url) => new URL(url).protocol === 'https:')),
  SHOPIFY_VERIFIED_PRODUCT_HANDLES: z.string().default(''),
  MARKET_COUNTRY: z.string().regex(/^[A-Z]{2}$/).default('AU'),
  MARKET_CURRENCY: z.string().regex(/^[A-Z]{3}$/).default('AUD'),
  NEXT_PUBLIC_SITE_URL: optional(z.string().url()),
  FORMS_WEBHOOK_URL: optional(z.string().url().refine((url) => new URL(url).protocol === 'https:')),
  FORMS_WEBHOOK_TOKEN: optional(z.string().min(16)),
  TRUST_PROXY_HEADERS: z.enum(['true', 'false']).default('false'),
});

export function getEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) throw new Error('Server configuration is invalid. Check the environment setup guide.');
  return result.data;
}

export function commerceConfigured() {
  const env = getEnv();
  return env.COMMERCE_MODE === 'live' && Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN);
}

export function verifiedHandles() {
  return new Set(getEnv().SHOPIFY_VERIFIED_PRODUCT_HANDLES.split(',').map((value) => value.trim()).filter(Boolean));
}
