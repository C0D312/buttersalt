import { NextResponse } from 'next/server';
import { commerceConfigured, getEnv } from '@/lib/env';
import { apiError, CommerceError } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const env = getEnv();
    if (!commerceConfigured() || !env.SHOPIFY_CUSTOMER_ACCOUNT_URL) throw new CommerceError('ACCOUNT_UNAVAILABLE', 'Customer accounts will be available through Shopify once merchant services are connected.', 503);
    // This is the account link copied from Admin Settings > Customer accounts.
    // Authentication and order authorisation remain on Shopify's hosted surface.
    return NextResponse.redirect(env.SHOPIFY_CUSTOMER_ACCOUNT_URL, 303);
  } catch (error) { return apiError(error); }
}
