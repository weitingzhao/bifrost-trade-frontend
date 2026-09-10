/**
 * What an option's numbers *mean*, declared once.
 *
 * The design system had 61 shared primitives and every one of them was
 * structural — tables, groups, tags, segments. The subject matter had none,
 * although Greeks appear in 90 files, ITM/OTM/ATM in 44 and DTE in 23, far past
 * the ≥3-page bar the Dense UI skill sets for promoting a primitive. So each
 * page decided the semantics locally, and two of them reached opposite
 * conclusions about the same word:
 *
 *   OptionContractDetailPanel  ITM → text-success   (a contract you might buy:
 *                                                    ITM means intrinsic value)
 *   BookVsBaseCockpit          ITM → text-loss      (short legs that went ITM:
 *                                                    assignment risk)
 *
 * Neither is wrong. Moneyness has no tone until you say which side of the
 * contract you are on — and nothing in the codebase said it, so a third page
 * would have had to work it out again. That rule is `moneynessTone`.
 *
 * Same argument for the expiry bands and the VRP bands below: the numbers were
 * already agreed, they just had no home, so agreement was coincidence rather
 * than something the next reader inherits.
 *
 * This module is the frontend's counterpart to the Massive Plugin's
 * `contracts.py`: one declaration, no second opinion.
 */

/* ── Moneyness ─────────────────────────────────────────────────────────── */

export type Moneyness = 'ITM' | 'ATM' | 'OTM'

/** Which side of the contract the reader holds. Moneyness has no tone without it. */
export type OptionSide = 'long' | 'short'

/**
 * favourable — the position gained something · adverse — it is exposed
 * pivot — at the money, where the next tick decides · neutral — nothing to say
 */
export type MoneynessTone = 'favourable' | 'adverse' | 'pivot' | 'neutral'

/** |moneyness %| inside this band reads as at-the-money. */
export const ATM_BAND_PCT = 0.5

/**
 * Signed distance from the strike, in percent of spot, oriented so positive is
 * always in-the-money for the right in question.
 */
export function moneynessPct(
  underlying: number | null | undefined,
  strike: number | null | undefined,
  isCall: boolean,
): number | null {
  if (underlying == null || !Number.isFinite(underlying) || underlying <= 0) return null
  if (strike == null || !Number.isFinite(strike)) return null
  return ((underlying - strike) / underlying) * 100 * (isCall ? 1 : -1)
}

/** Null when spot or strike is missing — an unknown moneyness, not an OTM one. */
export function moneynessFromPct(pct: number | null | undefined): Moneyness | null {
  if (pct == null || !Number.isFinite(pct)) return null
  if (Math.abs(pct) < ATM_BAND_PCT) return 'ATM'
  return pct > 0 ? 'ITM' : 'OTM'
}

/**
 * The rule the two pages had each worked out privately.
 *
 * Long: ITM is intrinsic value you own. Short: ITM is the leg that gets
 * assigned. OTM is deliberately quiet on both sides — a seller's whole book is
 * OTM, and colouring all of it would spend the reader's attention on the
 * ordinary case.
 */
export function moneynessTone(
  label: Moneyness | null | undefined,
  side: OptionSide,
): MoneynessTone {
  if (label == null) return 'neutral'
  if (label === 'ATM') return 'pivot'
  if (label === 'OTM') return 'neutral'
  return side === 'short' ? 'adverse' : 'favourable'
}

/** Text colour, in the shape of `pnlColorClass`. */
export function moneynessToneClass(tone: MoneynessTone): string {
  switch (tone) {
    case 'favourable':
      return 'text-success'
    case 'adverse':
      return 'text-loss'
    case 'pivot':
      return 'text-warning'
    default:
      return 'text-muted-foreground'
  }
}

/** Border + fill + text for a moneyness pill. */
export function moneynessBadgeClass(
  label: Moneyness | null | undefined,
  side: OptionSide,
): string {
  switch (moneynessTone(label, side)) {
    case 'favourable':
      return 'border-success/40 bg-success-soft text-success'
    case 'adverse':
      return 'border-loss/40 bg-danger-soft text-loss'
    case 'pivot':
      return 'border-primary/50 bg-primary/10'
    default:
      return 'border-muted-foreground/40 bg-muted text-muted-foreground'
  }
}

/* ── Time to expiry ────────────────────────────────────────────────────── */

/** Short legs inside this window are what the expiring alarm counts. */
export const NEAR_EXPIRY_DAYS = 7

/**
 * Inside this window theta dominates and assignment stops being theoretical.
 * Tighter than NEAR_EXPIRY_DAYS on purpose — "worth scheduling a roll" and
 * "decaying under you right now" are different questions.
 */
export const THETA_BURN_DAYS = 3

/** Operating buckets, in the language a seller schedules rolls in. */
export type ExpiryBucket = 'expired' | 'this_week' | 'next_week' | 'this_month' | 'later'

export function expiryBucket(dte: number | null | undefined): ExpiryBucket {
  if (dte == null || !Number.isFinite(dte)) return 'later'
  if (dte < 0) return 'expired'
  if (dte <= NEAR_EXPIRY_DAYS) return 'this_week'
  if (dte <= 14) return 'next_week'
  if (dte <= 35) return 'this_month'
  return 'later'
}

export const EXPIRY_BUCKET_LABEL: Record<ExpiryBucket, string> = {
  expired: 'Past expiry',
  this_week: `≤ ${NEAR_EXPIRY_DAYS} days`,
  next_week: '8–14 days',
  this_month: '15–35 days',
  later: '> 35 days',
}

/** Past expiry reads as adverse; inside the near window, as something to watch. */
export function dteToneClass(dte: number | null | undefined): string | undefined {
  if (dte == null || !Number.isFinite(dte)) return undefined
  if (dte < 0) return 'text-loss'
  return dte <= NEAR_EXPIRY_DAYS ? 'text-warning' : undefined
}

/* ── Variance risk premium ─────────────────────────────────────────────── */

/**
 * VRP percentile bands. One definition today; it lives here so the second
 * consumer inherits it instead of re-deciding where "elevated" starts.
 */
export const VRP_BANDS = [
  { floor: 80, label: 'Elevated VRP' },
  { floor: 50, label: 'Neutral VRP' },
  { floor: 20, label: 'Compressed VRP' },
] as const

export function vrpBandLabel(pct: number | null | undefined): string | null {
  if (pct == null || !Number.isFinite(pct)) return null
  for (const b of VRP_BANDS) if (pct >= b.floor) return b.label
  return 'Deep negative VRP'
}
