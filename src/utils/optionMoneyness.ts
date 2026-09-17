/**
 * Where a leg sits against its strike, and what part of its price is real.
 *
 * Three small pieces of arithmetic that decide whether a short leg is about to
 * become stock: how much room it has left, what it would be worth if the market
 * stopped now, and what is left over — the part that is only time.
 *
 * Shared because Expiration asks the first question and Assignment asks all
 * three, and two copies of "how far is spot from the strike" would eventually
 * disagree about which direction is trouble.
 */

export type OptionRight = 'C' | 'P' | ''

/**
 * How much room the leg has before the strike is in play.
 *
 * Signed towards trouble, so both rights read the same way: positive is room
 * left, negative is in the money. A short call is troubled by spot above the
 * strike; a short put by spot below it.
 */
export function cushionPct(spot: number | null, strike: number, right: OptionRight): number | null {
  if (spot == null || !Number.isFinite(spot) || spot <= 0 || !Number.isFinite(strike) || strike <= 0) return null
  if (right === 'C') return (strike - spot) / spot
  if (right === 'P') return (spot - strike) / spot
  return null
}

/** What the contract would be worth if the market stopped now. Never negative. */
export function intrinsicValue(spot: number | null, strike: number, right: OptionRight): number | null {
  if (spot == null || !Number.isFinite(spot) || !Number.isFinite(strike)) return null
  if (right === 'C') return Math.max(0, spot - strike)
  if (right === 'P') return Math.max(0, strike - spot)
  return null
}

/**
 * The part of the price that is only time — what a holder gives up by
 * exercising early, and therefore the number that decides whether they do.
 *
 * Floored at zero: a mark below intrinsic is a stale quote, not negative time
 * value, and reporting it as negative would read as "exercise is free money".
 */
export function extrinsicValue(mark: number | null, spot: number | null, strike: number, right: OptionRight): number | null {
  if (mark == null || !Number.isFinite(mark)) return null
  const intrinsic = intrinsicValue(spot, strike, right)
  if (intrinsic == null) return null
  return Math.max(0, mark - intrinsic)
}

/**
 * A cushion as the two option pages print it: `21.5%`, `−5.9%`, `—`.
 *
 * Unsigned when there is room and signed when there is not, because the sign is
 * the reading — negative means the strike is already in play. Typographic minus,
 * so a column of them lines up.
 */
export function fmtCushionPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v >= 0 ? '' : '−'}${Math.abs(v * 100).toFixed(1)}%`
}
