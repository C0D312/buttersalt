import { NextResponse } from 'next/server';
import { getCatalogue } from '@/lib/catalogue-server';
import { apiError } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json(await getCatalogue(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
