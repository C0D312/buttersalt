'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiMessage } from '@/lib/browser-errors';
import { Icon } from './icons';

export function SignupForm() {
  const fieldId = useId();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const submission = useRef<{ signature: string; id: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const payload = { type: 'newsletter', email: email.trim(), consent, website: fields.get('website') || '' };
    const signature = JSON.stringify(payload);
    if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setStatus('');
    setSuccess(false);
    try {
      if (process.env.NEXT_PUBLIC_STATIC_PREVIEW === 'true') throw new Error('Newsletter signup is not connected in this development preview. Your signup has not been sent.');
      const response = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, submissionId: submission.current.id }) });
      let data;
      try { data = await response.json(); } catch { throw new Error('Newsletter signup is not connected in this development preview. Your signup has not been sent.'); }
      if (!response.ok) throw new Error(apiMessage(data, 'We could not confirm your signup. Please retry.'));
      if (data.success !== true) throw new Error('Your signup could not be confirmed. Please retry.');
      setStatus('Thanks. Your signup was accepted.');
      setSuccess(true);
      setEmail('');
      setConsent(false);
      submission.current = null;
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'Connection interrupted. Your email has been kept. Please retry.'); }
    finally { setBusy(false); }
  }
  return <form className="signup" onSubmit={submit}>
    <label htmlFor={fieldId} className="sr-only">Email address for newsletter</label>
    <div className="signup-input"><input id={fieldId} name="email" type="email" required placeholder="Your email address" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} disabled={busy} /><button aria-label="Sign up for newsletter" disabled={busy || !consent}><Icon name="arrow" /></button></div>
    <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="consent"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /> I agree to receive emails and the <Link href="/privacy">privacy notice</Link>.</label>
    {status && <p className="form-status" role={success ? 'status' : 'alert'}>{status}</p>}
  </form>;
}
