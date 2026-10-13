import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { formSchema } from '@/lib/commerce-validation';
import { getEnv } from '@/lib/env';
import { apiError, assertSameOrigin, CommerceError, rateLimit, readBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
type Delivery = { fingerprint: string; expires: number; pending: Promise<void> };
const deliveries = new Map<string, Delivery>();

async function deliver(payload: unknown, submissionId: string) {
  const env = getEnv();
  if (!env.FORMS_WEBHOOK_URL || !env.FORMS_WEBHOOK_TOKEN) throw new CommerceError('FORM_UNCONNECTED', 'This form is not connected yet. Your message has not been sent. Please try again after the merchant connects a delivery destination.', 503);
  let response: Response;
  try {
    response = await fetch(env.FORMS_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.FORMS_WEBHOOK_TOKEN}`, 'Idempotency-Key': submissionId },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store',
    });
  } catch {
    throw new CommerceError('DELIVERY_UNCONFIRMED', 'We could not confirm delivery. Your form details have been kept on this page. Retry with the same submission reference.', 502);
  }
  if (!response.ok) throw new CommerceError('DELIVERY_FAILED', 'The destination did not accept your submission. Your details have been kept. Please try again later.', 502);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(request, 'forms', 8, 10 * 60 * 1000);
    const parsed = formSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new CommerceError('INVALID_FORM', 'Please check your email, consent and the required fields.', 400);
    const payload = { type: parsed.data.type, name: parsed.data.name, email: parsed.data.email, message: parsed.data.message, company: parsed.data.company, quantity: parsed.data.quantity, consent: parsed.data.consent, submissionId: parsed.data.submissionId };
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const now = Date.now();
    for (const [key, entry] of deliveries) if (entry.expires <= now) deliveries.delete(key);
    const existing = deliveries.get(payload.submissionId);
    if (existing && existing.fingerprint !== fingerprint) throw new CommerceError('DUPLICATE_REFERENCE', 'This submission reference was already used for different details. Start a new submission.', 409);
    if (existing) await existing.pending;
    else {
      const pending = deliver(payload, payload.submissionId);
      deliveries.set(payload.submissionId, { fingerprint, expires: now + 24 * 60 * 60 * 1000, pending });
      try { await pending; } catch (error) { deliveries.delete(payload.submissionId); throw error; }
    }
    return NextResponse.json({ success: true, message: 'Your submission was accepted by the connected destination.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
