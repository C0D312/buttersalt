/** Quantity rules apply to the total of this merchandise across cart lines. */
export function cartQuantityTargets(quantity: number, maximum: number, minimum = 1, increment = 1, elsewhere = 0) {
  const unavailable = { decrease: null, increase: null };
  if (![quantity, maximum, minimum, increment, elsewhere].every(Number.isInteger) || quantity < 1 || minimum < 1 || increment < 1 || elsewhere < 0 || maximum < minimum) return unavailable;
  const aggregate = quantity + elsewhere;
  const highest = minimum + Math.floor((maximum - minimum) / increment) * increment;
  // An externally edited quantity may be off-rule or above current stock.
  // Move to the nearest permitted total, rather than submitting another error.
  const below = Math.min(highest, minimum + (Math.ceil((aggregate - minimum) / increment) - 1) * increment);
  const above = Math.max(minimum, minimum + (Math.floor((aggregate - minimum) / increment) + 1) * increment);
  const decrease = below - elsewhere;
  const increase = above - elsewhere;
  return {
    decrease: below >= minimum && decrease > 0 && decrease < quantity ? decrease : null,
    increase: above <= highest && increase > quantity ? increase : null,
  };
}
