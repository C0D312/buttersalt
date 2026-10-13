import { afterEach, describe, expect, it, vi } from 'vitest';
const configuration = vi.hoisted(() => ({ NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000', TRUST_PROXY_HEADERS: 'false' }));
vi.mock('../src/lib/env', () => ({ getEnv: () => configuration }));
import { apiError, assertSameOrigin, buyerIp, CommerceError, rateLimit, readBody } from '../src/lib/http';

const request = (body: string, headers: Record<string, string> = {}) => new Request('http://127.0.0.1:3000/api/cart', { method: 'POST', body, headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:3000', ...headers } });
afterEach(() => { configuration.TRUST_PROXY_HEADERS = 'false'; vi.restoreAllMocks(); });

describe('HTTP input and error boundaries', () => {
  it('requires both a matching origin and a JSON content type', () => {
    expect(() => assertSameOrigin(request('{}'))).not.toThrow();
    expect(() => assertSameOrigin(request('{}', { Origin: 'https://attacker.example' }))).toThrow();
    expect(() => assertSameOrigin(request('{}', { 'Content-Type': 'text/plain' }))).toThrow();
  });
  it('rejects malformed JSON and oversized bodies', async () => {
    await expect(readBody(request('{invalid'))).rejects.toMatchObject({ code: 'INVALID_JSON' });
    await expect(readBody(request(JSON.stringify({ value: 'x'.repeat(13_000) })))).rejects.toMatchObject({ code: 'REQUEST_TOO_LARGE' });
    await expect(readBody(request('{}', { 'Content-Length': '13000' }))).rejects.toMatchObject({ code: 'REQUEST_TOO_LARGE' });
  });
  it('reads valid JSON without accepting executable interpretation', async () => {
    const text = '<script>alert(1)</script>';
    await expect(readBody(request(JSON.stringify({ text })))).resolves.toEqual({ text });
  });
  it('cancels an oversized chunked body instead of reading it without a bound', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(8000)); controller.enqueue(new Uint8Array(8000)); },
      cancel() { cancelled = true; },
    });
    const options: RequestInit & { duplex: 'half' } = { method: 'POST', body: stream, duplex: 'half' };
    await expect(readBody(new Request('http://127.0.0.1:3000/api/cart', options))).rejects.toMatchObject({ code: 'REQUEST_TOO_LARGE' });
    expect(cancelled).toBe(true);
  });
  it('redacts unknown failures instead of exposing secrets or personal details', async () => {
    const response = apiError(new Error('merchant token secret, buyer private@example.com'));
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).not.toContain('merchant token');
    expect(body).not.toContain('private@example.com');
    expect(body).toContain('SERVICE_UNAVAILABLE');
  });
  it('preserves actionable known error codes without caching the response', async () => {
    const response = apiError(new CommerceError('QUANTITY_UNAVAILABLE', 'Please refresh your basket.', 409));
    expect(response.status).toBe(409);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: { code: 'QUANTITY_UNAVAILABLE', message: 'Please refresh your basket.' } });
  });
  it('ignores arbitrary forwarded IP headers until the proxy is explicitly trusted', () => {
    expect(buyerIp(request('{}', { 'x-forwarded-for': '1.2.3.4' }))).toBeUndefined();
    configuration.TRUST_PROXY_HEADERS = 'true';
    expect(buyerIp(request('{}', { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(buyerIp(request('{}', { 'x-forwarded-for': 'malicious arbitrary text' }))).toBeUndefined();
  });
  it('cannot evade the anonymous rate cap with arbitrary cookie headers', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2030, 0, 1));
    const scope = `independent-test-${crypto.randomUUID()}`;
    rateLimit(request('{}', { Cookie: 'attacker=one' }), scope, 1, 60_000);
    expect(() => rateLimit(request('{}', { Cookie: 'attacker=two' }), scope, 1, 60_000)).toThrow('Too many requests');
  });
});
