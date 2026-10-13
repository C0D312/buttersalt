import { describe, expect, it } from 'vitest';
import { cartQuantityTargets } from '../src/lib/cart-quantity';
import { quantityAllowed } from '../src/lib/commerce-validation';

describe('cart quantity controls', () => {
  it('retains ordinary one-bag controls and keeps removal explicit', () => {
    expect(cartQuantityTargets(1, 12)).toEqual({ decrease: null, increase: 2 });
    expect(cartQuantityTargets(12, 12)).toEqual({ decrease: 11, increase: null });
  });
  it('starts at the merchant minimum and moves by the merchant increment', () => {
    expect(cartQuantityTargets(3, 12, 3, 2)).toEqual({ decrease: null, increase: 5 });
    expect(cartQuantityTargets(5, 12, 3, 2)).toEqual({ decrease: 3, increase: 7 });
    expect(cartQuantityTargets(11, 12, 3, 2)).toEqual({ decrease: 9, increase: null });
  });
  it('repairs an externally edited quantity instead of submitting another off-rule quantity', () => {
    expect(cartQuantityTargets(4, 11, 3, 2)).toEqual({ decrease: 3, increase: 5 });
    expect(cartQuantityTargets(2, 11, 3, 2)).toEqual({ decrease: null, increase: 3 });
  });
  it('can lower an existing line to current stock after stock falls', () => {
    expect(cartQuantityTargets(20, 11, 3, 2)).toEqual({ decrease: 11, increase: null });
    expect(cartQuantityTargets(3, 2, 3, 2)).toEqual({ decrease: null, increase: null });
  });
  it('includes standalone and box components in the same variant limit', () => {
    expect(cartQuantityTargets(6, 12, 1, 1, 6)).toEqual({ decrease: 5, increase: null });
    expect(cartQuantityTargets(2, 11, 3, 2, 3)).toEqual({ decrease: null, increase: 4 });
    expect(cartQuantityTargets(3, 11, 3, 2, 3)).toEqual({ decrease: 2, increase: 4 });
  });
  it('disables actions for invalid or unavailable provider quantity data', () => {
    for (const values of [[0, 12, 1, 1, 0], [2.5, 12, 1, 1, 0], [2, 0, 1, 1, 0], [2, 12, 0, 1, 0], [2, 12, 1, 0, 0], [2, 12, 1, 1, -1]]) {
      expect(cartQuantityTargets(values[0], values[1], values[2], values[3], values[4])).toEqual({ decrease: null, increase: null });
    }
  });
  it('every enabled control satisfies the same aggregate rule the server enforces', () => {
    for (const minimum of [1, 2, 3]) for (const increment of [1, 2, 3]) for (const elsewhere of [0, 1, 4]) for (let quantity = 1; quantity <= 16; quantity++) {
      const targets = cartQuantityTargets(quantity, 12, minimum, increment, elsewhere);
      for (const target of [targets.decrease, targets.increase]) {
        if (target === null) continue;
        expect(target).toBeGreaterThan(0);
        expect(quantityAllowed(target + elsewhere, 12, minimum, increment)).toBe(true);
      }
    }
  });
});
