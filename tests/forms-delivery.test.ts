import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configuration = vi.hoisted(() => ({
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
  FORMS_WEBHOOK_URL: undefined as string | undefined,
  FORMS_WEBHOOK_TOKEN: undefined as string | undefined,
  TRUST_PROXY_HEADERS: 'false',
}));
vi.mock('../src/lib/env', () => ({ getEnv: () => configuration }));
import { POST } from '../src/app/api/forms/route';

let epoch = Date.UTC(2026, 9, 14);
const input = () => ({ type: 'contact', name: 'Jamie', email: 'jamie@example.com', message: 'Please tell me about the gift range.', consent: true, submissionId: crypto.randomUUID() });
const request = (payload: unknown, origin = 'http://127.0.0.1:3000') => new Request('http://127.0.0.1:3000/api/forms', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

beforeEach(() => {
  epoch += 11 * 60 * 1000;
  vi.spyOn(Date, 'now').mockReturnValue(epoch);
  configuration.FORMS_WEBHOOK_URL = undefined;
  configuration.FORMS_WEBHOOK_TOKEN = undefined;
  vi.unstubAllGlobals();
});
afterEach(() => vi.restoreAllMocks());

describe('form route performs and verifies actual destination delivery', () => {
  it('returns an explicit failure when no destination is configured', async () => {
    const response = await POST(request(input()));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: 'FORM_UNCONNECTED' } });
  });

  it('reports success only after HTTP acceptance and deduplicates the submission reference', async () => {
    configuration.FORMS_WEBHOOK_URL = 'https://merchant.example/forms';
    configuration.FORMS_WEBHOOK_TOKEN = 'test-only-placeholder-token';
    const deliver = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', deliver);
    const payload = input();
    const first = await POST(request(payload));
    const repeated = await POST(request(payload));
    expect(first.status).toBe(200);
    expect(repeated.status).toBe(200);
    expect(await first.json()).toMatchObject({ success: true });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][1]).toMatchObject({ method: 'POST', redirect: 'error', cache: 'no-store', headers: { 'Idempotency-Key': payload.submissionId } });
  });

  it('rejects reusing a submission reference for different content', async () => {
    configuration.FORMS_WEBHOOK_URL = 'https://merchant.example/forms';
    configuration.FORMS_WEBHOOK_TOKEN = 'test-only-placeholder-token';
    const deliver = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', deliver);
    const payload = input();
    await POST(request(payload));
    const response = await POST(request({ ...payload, message: 'A completely different enquiry message.' }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'DUPLICATE_REFERENCE' } });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it('returns a failure when the configured destination rejects a submission', async () => {
    configuration.FORMS_WEBHOOK_URL = 'https://merchant.example/forms';
    configuration.FORMS_WEBHOOK_TOKEN = 'test-only-placeholder-token';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    const response = await POST(request(input()));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'DELIVERY_FAILED' } });
  });

  it('keeps a failed submission retryable with the same reference', async () => {
    configuration.FORMS_WEBHOOK_URL = 'https://merchant.example/forms';
    configuration.FORMS_WEBHOOK_TOKEN = 'test-only-placeholder-token';
    const deliver = vi.fn(async () => new Response(null, { status: 202 })).mockRejectedValueOnce(new TypeError('connection failed'));
    vi.stubGlobal('fetch', deliver);
    const payload = input();
    const failed = await POST(request(payload));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ error: { code: 'DELIVERY_UNCONFIRMED' } });
    const retried = await POST(request(payload));
    expect(retried.status).toBe(200);
    expect(deliver).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed input before any delivery attempt', async () => {
    const deliver = vi.fn();
    vi.stubGlobal('fetch', deliver);
    const response = await POST(request({ ...input(), email: 'bad-email' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_FORM' } });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin submission before any delivery attempt', async () => {
    const deliver = vi.fn();
    vi.stubGlobal('fetch', deliver);
    const response = await POST(request(input(), 'https://attacker.example'));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_ORIGIN' } });
    expect(deliver).not.toHaveBeenCalled();
  });
});
