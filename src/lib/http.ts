import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getEnv } from './env';

export class CommerceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}

export function apiError(error: unknown) {
  const known = error instanceof CommerceError;
  return NextResponse.json({ error: { code: known ? error.code : 'SERVICE_UNAVAILABLE', message: known ? error.message : 'The service could not complete this request. Please try again.' } }, { status: known ? error.status : 502, headers: { 'Cache-Control': 'no-store' } });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = getEnv().NEXT_PUBLIC_SITE_URL ? new URL(getEnv().NEXT_PUBLIC_SITE_URL!).origin : new URL(request.url).origin;
  if (!origin || origin !== expected) throw new CommerceError('INVALID_ORIGIN', 'This request must come from the storefront.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new CommerceError('INVALID_CONTENT_TYPE', 'Please send a JSON request.', 415);
}

export async function readBody(request: Request, maximum = 12_000): Promise<unknown> {
  if (Number(request.headers.get('content-length') || '0') > maximum) throw new CommerceError('REQUEST_TOO_LARGE', 'The submission is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CommerceError('INVALID_JSON', 'The request could not be read.', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new CommerceError('REQUEST_TOO_LARGE', 'The submission is too large.', 413);
    }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new CommerceError('INVALID_JSON', 'The request could not be read.', 400); }
}

export function buyerIp(request: Request) {
  // Enable only behind a reverse proxy which removes user-supplied forwarding headers.
  if (getEnv().TRUST_PROXY_HEADERS !== 'true') return undefined;
  const candidate = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return candidate && /^[a-fA-F0-9:.]{3,64}$/.test(candidate) ? candidate : undefined;
}

const buckets = new Map<string, { count: number; expires: number }>();
export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.expires <= now) buckets.delete(key);
  // Arbitrary cookies are not a client identity. Anonymous traffic shares a cap
  // unless a trusted deployment proxy supplies the actual source address.
  const source = buyerIp(request) ?? 'unidentified';
  const key = `${scope}:${createHash('sha256').update(source).digest('hex')}`;
  const bucket = buckets.get(key) ?? { count: 0, expires: now + windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > limit) throw new CommerceError('RATE_LIMITED', 'Too many requests. Please wait and try again.', 429);
}
