import { z } from 'zod';

const variantId = z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/);
const lineId = z.string().min(1).max(400);
const requestId = z.string().uuid();
export const cartActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), variantId, quantity: z.number().int().min(1).max(12), requestId }).strict(),
  z.object({ action: z.literal('update'), lineId, quantity: z.number().int().min(0).max(12), requestId }).strict(),
  z.object({ action: z.literal('remove'), lineId, requestId }).strict(),
  z.object({ action: z.literal('discount'), code: z.string().trim().max(100).regex(/^[A-Za-z0-9 _-]*$/), requestId }).strict(),
  z.object({ action: z.literal('box'), components: z.array(z.object({ variantId, quantity: z.number().int().min(1).max(6) }).strict()).min(1).max(6), requestId }).strict(),
]);
export type CartAction = z.infer<typeof cartActionSchema>;

export const formSchema = z.object({
  type: z.enum(['contact', 'wholesale', 'newsletter']),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(3000).optional(),
  company: z.string().trim().max(120).optional(),
  quantity: z.number().int().min(1).max(100000).optional(),
  consent: z.literal(true),
  website: z.string().max(0).default(''),
  submissionId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.type !== 'newsletter' && (!value.name || !value.message)) context.addIssue({ code: 'custom', message: 'Please enter your name and a message.' });
});

export function quantityAllowed(quantity: number, limit: number, minimum = 1, increment = 1) {
  return Number.isInteger(quantity) && quantity >= minimum && quantity <= limit && (quantity - minimum) % increment === 0;
}

export function mixedBoxQuantity(components: { variantId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const component of components) merged.set(component.variantId, (merged.get(component.variantId) ?? 0) + component.quantity);
  return [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}
