'use client';
import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiMessage } from '@/lib/browser-errors';
import { Icon } from './icons';

export function ContactForm({ wholesale = false }: { wholesale?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const submission = useRef<{ signature: string; id: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = { type: wholesale ? 'wholesale' : 'contact', name: fields.get('name'), email: fields.get('email'), company: fields.get('company') || undefined, quantity: fields.get('quantity') ? Number(fields.get('quantity')) : undefined, message: fields.get('message'), consent: fields.get('consent') === 'on', website: fields.get('website') || '' };
    const signature = JSON.stringify(payload);
    if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setStatus('');
    setSuccess(false);
    try {
      if (process.env.NEXT_PUBLIC_STATIC_PREVIEW === 'true') throw new Error('Enquiries are not connected in this private preview. Your message has not been sent.');
      const response = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, submissionId: submission.current.id }) });
      let result;
      try { result = await response.json(); } catch { throw new Error('Enquiries are not connected in this private preview. Your message has not been sent.'); }
      if (!response.ok) throw new Error(apiMessage(result, 'Your message could not be delivered. Please retry.'));
      if (result.success !== true) throw new Error('Your enquiry could not be confirmed. Please retry.');
      setStatus('Your enquiry was accepted. Thanks for getting in touch.');
      setSuccess(true);
      form.reset();
      submission.current = null;
    } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'Connection interrupted. Your details have been kept. Please retry.'); }
    finally { setBusy(false); }
  }
  return <form className="contact-form" onSubmit={submit}>
    <div className="form-grid">
      <label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="First and last name" disabled={busy} /></label>
      <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" disabled={busy} /></label>
      {wholesale && <>
        <label>Company / occasion<input name="company" maxLength={120} autoComplete="organization" placeholder="Who are we treating?" disabled={busy} /></label>
        <label>Approximate number of gifts<input name="quantity" type="number" min={1} max={100000} step={1} placeholder="e.g. 50" disabled={busy} /></label>
      </>}
    </div>
    <label>{wholesale ? 'Tell us what you have in mind' : 'Your message'}<textarea name="message" required minLength={10} maxLength={3000} rows={5} placeholder={wholesale ? 'Your occasion, timing, quantities and any other details…' : 'A question, an idea, a hello…'} disabled={busy} /></label>
    <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="form-consent"><input name="consent" type="checkbox" required disabled={busy} /> I agree to the <Link href="/privacy">privacy notice</Link> and processing of my enquiry.</label>
    {status && <p role={success ? 'status' : 'alert'} className={success ? 'form-success' : 'form-error'}>{status}</p>}
    <button className="button" disabled={busy}>{busy ? 'Sending…' : wholesale ? 'Send a gift enquiry' : 'Send your message'}<Icon name="arrow" /></button>
    <p className="fineprint">This form delivers enquiries only after a merchant destination is connected.</p>
  </form>;
}
