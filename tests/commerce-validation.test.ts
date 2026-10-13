import { describe, expect, it } from 'vitest';
import { cartActionSchema, formSchema, mixedBoxQuantity, quantityAllowed } from '../src/lib/commerce-validation';

const requestId = 'ab123456-1234-4234-8234-123456789abc';
const variantId = 'gid://shopify/ProductVariant/123';

describe('server cart request boundary', () => {
  it('accepts provider variant IDs and a valid quantity', () => {
    expect(cartActionSchema.safeParse({ action: 'add', variantId, quantity: 2, requestId }).success).toBe(true);
  });
  it.each([0, -1, 1.5, 13, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid add quantity %s', (quantity) => {
    expect(cartActionSchema.safeParse({ action: 'add', variantId, quantity, requestId }).success).toBe(false);
  });
  it('rejects browser-supplied price or discount fields', () => {
    expect(cartActionSchema.safeParse({ action: 'add', variantId, quantity: 1, requestId, price: 0.01 }).success).toBe(false);
    expect(cartActionSchema.safeParse({ action: 'add', variantId, quantity: 1, requestId, discount: 100 }).success).toBe(false);
  });
  it('rejects development identifiers at the live API boundary', () => {
    expect(cartActionSchema.safeParse({ action: 'add', variantId: 'concept:salted-caramel:signature', quantity: 1, requestId }).success).toBe(false);
  });
  it('requires a UUID for mutation idempotency', () => {
    expect(cartActionSchema.safeParse({ action: 'add', variantId, quantity: 1, requestId: 'reused' }).success).toBe(false);
  });
  it('permits zero in update for removal, but not negative quantities', () => {
    expect(cartActionSchema.safeParse({ action: 'update', lineId: 'line-1', quantity: 0, requestId }).success).toBe(true);
    expect(cartActionSchema.safeParse({ action: 'update', lineId: 'line-1', quantity: -1, requestId }).success).toBe(false);
  });
  it('rejects oversized or executable discount input', () => {
    expect(cartActionSchema.safeParse({ action: 'discount', code: 'x'.repeat(101), requestId }).success).toBe(false);
    expect(cartActionSchema.safeParse({ action: 'discount', code: '<script>alert(1)</script>', requestId }).success).toBe(false);
  });
});

describe('provider quantity constraints and mixed-box components', () => {
  it('honours minimum, maximum and increment', () => {
    expect(quantityAllowed(3, 9, 3, 3)).toBe(true);
    expect(quantityAllowed(6, 9, 3, 3)).toBe(true);
    expect(quantityAllowed(9, 9, 3, 3)).toBe(true);
    expect(quantityAllowed(4, 9, 3, 3)).toBe(false);
    expect(quantityAllowed(12, 9, 3, 3)).toBe(false);
    expect(quantityAllowed(0, 9, 3, 3)).toBe(false);
    expect(quantityAllowed(3.5, 9, 3, 3)).toBe(false);
  });
  it('merges repeated flavour selections without losing quantity', () => {
    expect(mixedBoxQuantity([{ variantId, quantity: 2 }, { variantId: 'gid://shopify/ProductVariant/456', quantity: 1 }, { variantId, quantity: 3 }])).toEqual([
      { variantId, quantity: 5 }, { variantId: 'gid://shopify/ProductVariant/456', quantity: 1 },
    ]);
  });
  it('rejects individual box components above capacity', () => {
    expect(cartActionSchema.safeParse({ action: 'box', components: [{ variantId, quantity: 7 }], requestId }).success).toBe(false);
  });
});

describe('actual form submission boundary', () => {
  const contact = { type: 'contact', name: 'Jamie', email: 'jamie@example.com', message: 'Please tell me about the gift range.', consent: true, submissionId: requestId };
  it('accepts a complete enquiry with consent', () => {
    expect(formSchema.safeParse(contact).success).toBe(true);
  });
  it('rejects invalid email, missing message or missing consent', () => {
    expect(formSchema.safeParse({ ...contact, email: 'not-an-email' }).success).toBe(false);
    expect(formSchema.safeParse({ ...contact, message: undefined }).success).toBe(false);
    expect(formSchema.safeParse({ ...contact, consent: false }).success).toBe(false);
  });
  it('rejects honeypot content and unrecognised fields', () => {
    expect(formSchema.safeParse({ ...contact, website: 'spam.example' }).success).toBe(false);
    expect(formSchema.safeParse({ ...contact, destination: 'https://attacker.example' }).success).toBe(false);
  });
  it('allows newsletter with email and consent but no message', () => {
    expect(formSchema.safeParse({ type: 'newsletter', email: 'jamie@example.com', consent: true, submissionId: requestId }).success).toBe(true);
  });
});
