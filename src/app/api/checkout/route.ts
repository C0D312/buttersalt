import { NextResponse } from 'next/server';
import { apiError, assertSameOrigin, buyerIp, rateLimit } from '@/lib/http';
import { getCheckoutUrl } from '@/lib/shopify';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, 'checkout', 15, 60000);
    return NextResponse.json({ checkoutUrl: await getCheckoutUrl(buyerIp(request)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
