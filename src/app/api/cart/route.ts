import { NextResponse } from 'next/server';
import { commerceConfigured } from '@/lib/env';
import { apiError, assertSameOrigin, buyerIp, CommerceError, rateLimit, readBody } from '@/lib/http';
import { cartActionSchema } from '@/lib/commerce-validation';
import { changeCart, getCart, requireLiveCommerce } from '@/lib/shopify';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (!commerceConfigured()) return NextResponse.json({ mode: 'development', cart: null }, { headers: { 'Cache-Control': 'no-store' } });
    rateLimit(request, 'cart-read', 120, 60000);
    return NextResponse.json({ mode: 'live', cart: await getCart(buyerIp(request)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, 'cart-write', 60, 60000);
    requireLiveCommerce();
    const input = cartActionSchema.safeParse(await readBody(request));
    if (!input.success) throw new CommerceError('INVALID_CART_INPUT', 'Check the selected product and quantity, then try again.', 400);
    return NextResponse.json({ mode: 'live', cart: await changeCart(input.data, buyerIp(request)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
