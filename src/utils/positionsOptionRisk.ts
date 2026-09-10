/**
 * The two numbers an options seller reads before any P&L number: how long is
 * left, and how much room is left before a short strike is breached.
 *
 * The instance table was organised like a ledger — opened, quantity, cost,
 * mark. Expiry and strike existed only one level down, so the summary row could
 * not distinguish a 45-day 15% OTM short call from a 3-day at-the-money one.
 * Those are the same trade on paper and completely different trades in the
 * morning. Everything here is derived from fields the row already carries.
 *
 * Cushion is computed for **short** legs only. That is not a simplification: a
 * long leg going in the money is good news, and folding both into one signed
 * number would make the sign mean opposite things in the same column. Instances
 * with no short legs report no cushion rather than a reassuring one.
 */
import { daysUntilExpiry } from './positions'

export interface OptionLegLike {
  strike: number
  expiry: string
  right: string
  /** Signed: negative is short. */
  qty: number
}

/** 'C' | 'P', tolerant of 'CALL' / 'call' / 'Put'. Null when unrecognised. */
export function normalizeRight(right: string | null | undefined): 'C' | 'P' | null {
  const r = (right ?? '').trim().toUpperCase()
  if (r.startsWith('C')) return 'C'
  if (r.startsWith('P')) return 'P'
  return null
}

// ── Expiry ───────────────────────────────────────────────────────────────────

export interface ExpirySummary {
  /** Days to the nearest expiry. Negative once that expiry has passed. */
  dte: number | null
  /** Raw expiry string `dte` refers to. */
  expiry: string | null
  /** Distinct expiries held. >1 means the row's DTE is only the front one. */
  expiryCount: number
}

/**
 * The nearest expiry, because that is the one that forces a decision. Legs
 * whose expiry cannot be parsed are excluded from the minimum rather than
 * treated as zero — an unparsable date must not manufacture urgency.
 */
export function summarizeExpiry(legs: readonly OptionLegLike[]): ExpirySummary {
  let dte: number | null = null
  let expiry: string | null = null
  const distinct = new Set<string>()
  for (const leg of legs) {
    const d = daysUntilExpiry(leg.expiry)
    if (d == null) continue
    distinct.add(leg.expiry)
    if (dte == null || d < dte) {
      dte = d
      expiry = leg.expiry
    }
  }
  return { dte, expiry, expiryCount: distinct.size }
}

// ── Moneyness ────────────────────────────────────────────────────────────────

/**
 * Room left on a short leg, as a fraction of its strike. Positive is out of the
 * money; negative means the strike is already breached by that much.
 */
export function shortLegCushion(
  right: string,
  strike: number,
  spot: number,
): number | null {
  const r = normalizeRight(right)
  if (r == null || !Number.isFinite(strike) || strike <= 0 || !Number.isFinite(spot)) return null
  return r === 'C' ? (strike - spot) / strike : (spot - strike) / strike
}

export interface CushionSummary {
  /** Tightest short leg's cushion. Negative = in the money. */
  cushionPct: number | null
  /** The leg `cushionPct` refers to. */
  leg: OptionLegLike | null
  /** Spot used for that leg, so the cell can show what it compared against. */
  spot: number | null
  /** Short legs currently in the money. */
  itmShortCount: number
  shortLegCount: number
  /** Short legs skipped because no spot was available — not counted as safe. */
  unpricedShortCount: number
}

/**
 * The tightest short leg in the group. Minimum, not average: an average cushion
 * across four legs stays comfortable while one of them is being assigned.
 */
export function summarizeCushion<T extends OptionLegLike>(
  legs: readonly T[],
  spotOf: (leg: T) => number | null,
): CushionSummary {
  let cushionPct: number | null = null
  let tightest: OptionLegLike | null = null
  let tightestSpot: number | null = null
  let itmShortCount = 0
  let shortLegCount = 0
  let unpricedShortCount = 0

  for (const leg of legs) {
    if (leg.qty >= 0) continue
    shortLegCount += 1
    const spot = spotOf(leg)
    if (spot == null || !Number.isFinite(spot) || spot <= 0) {
      unpricedShortCount += 1
      continue
    }
    const c = shortLegCushion(leg.right, leg.strike, spot)
    if (c == null) {
      unpricedShortCount += 1
      continue
    }
    if (c < 0) itmShortCount += 1
    if (cushionPct == null || c < cushionPct) {
      cushionPct = c
      tightest = leg
      tightestSpot = spot
    }
  }

  return {
    cushionPct,
    leg: tightest,
    spot: tightestSpot,
    itmShortCount,
    shortLegCount,
    unpricedShortCount,
  }
}

/** Short-leg cushion bands. `breached` is in the money, not merely close. */
export type CushionBand = 'breached' | 'tight' | 'comfortable'

/**
 * Where the cushion stops being comfortable.
 *
 * `tightPct` is the trader's warning line, not a property of the position, so it
 * is passed in rather than baked here — see `useCushionThreshold`. The
 * `breached` band is not configurable: in the money is a fact about the strike.
 */
export function cushionBand(cushionPct: number, tightPct: number): CushionBand {
  if (cushionPct < 0) return 'breached'
  if (cushionPct < tightPct) return 'tight'
  return 'comfortable'
}

// ── Breakeven ────────────────────────────────────────────────────────────────

export interface BreakevenSummary {
  prices: number[]
  /** The breakeven closest to spot — the one price actually in play. */
  nearest: number | null
  /** Spot's distance from `nearest`, as a fraction of it. Positive = spot above. */
  distancePct: number | null
}

export function summarizeBreakeven(
  prices: readonly number[],
  spot: number | null,
): BreakevenSummary {
  const clean = prices.filter((p) => Number.isFinite(p)).slice().sort((a, b) => a - b)
  if (clean.length === 0) return { prices: [], nearest: null, distancePct: null }
  if (spot == null || !Number.isFinite(spot) || spot <= 0) {
    return { prices: clean, nearest: clean[0] ?? null, distancePct: null }
  }
  let nearest = clean[0] as number
  for (const p of clean) {
    if (Math.abs(p - spot) < Math.abs(nearest - spot)) nearest = p
  }
  return { prices: clean, nearest, distancePct: nearest === 0 ? null : (spot - nearest) / nearest }
}

// ── Expiry ladder ────────────────────────────────────────────────────────────

export interface LadderLeg extends OptionLegLike {
  /** Root symbol of the underlying, resolved by the caller. */
  underlying: string
  /** Identifies the strategy instance the leg belongs to. */
  instanceKey: string
}

export interface ExpiryLadderRow {
  expiry: string
  dte: number | null
  legCount: number
  /** Contracts, absolute. Split so a hedged row does not net to zero. */
  shortContracts: number
  longContracts: number
  itmShortCount: number
  /** Short legs on this expiry with no spot — cannot be called safe. */
  unpricedShortCount: number
  symbols: string[]
  instanceCount: number
  /**
   * Tightest short-leg cushion falling on this date. Negative = already breached.
   *
   * Deliberately not P&L. The instance table derives option P&L from matched
   * executions and falls back to the snapshot only when there are none; summing
   * the snapshot field here produced a column of zeroes sitting under real
   * numbers. A per-expiry P&L has to come from that same derivation or not at
   * all — and the question this view answers is which week is dangerous, which
   * cushion answers directly.
   */
  tightestCushionPct: number | null
}

/**
 * The book as a calendar rather than as a list of strategies.
 *
 * A seller's operating rhythm runs on expiry weeks — rolls, assignment, pin
 * risk all land on those dates — and no view in Positions aggregated on that
 * axis. Legs with an unparsable expiry are dropped here on purpose: a ladder
 * exists to be read chronologically, and a row that cannot be placed in time
 * would sit at one end of it implying an urgency it has not earned.
 */
export function buildExpiryLadder(
  legs: readonly LadderLeg[],
  spotOf: (leg: LadderLeg) => number | null,
): ExpiryLadderRow[] {
  const byExpiry = new Map<string, LadderLeg[]>()
  for (const leg of legs) {
    if (daysUntilExpiry(leg.expiry) == null) continue
    const bucket = byExpiry.get(leg.expiry)
    if (bucket) bucket.push(leg)
    else byExpiry.set(leg.expiry, [leg])
  }

  const rows: ExpiryLadderRow[] = []
  for (const [expiry, bucket] of byExpiry) {
    const symbols = new Set<string>()
    const instances = new Set<string>()
    let shortContracts = 0
    let longContracts = 0
    let itmShortCount = 0
    let unpricedShortCount = 0
    let tightestCushionPct: number | null = null

    for (const leg of bucket) {
      if (leg.underlying) symbols.add(leg.underlying)
      instances.add(leg.instanceKey)
      if (leg.qty < 0) shortContracts += Math.abs(leg.qty)
      else longContracts += leg.qty
      if (leg.qty < 0) {
        const spot = spotOf(leg)
        const c = spot == null ? null : shortLegCushion(leg.right, leg.strike, spot)
        if (c == null) unpricedShortCount += 1
        else {
          if (c < 0) itmShortCount += 1
          if (tightestCushionPct == null || c < tightestCushionPct) tightestCushionPct = c
        }
      }
    }

    rows.push({
      expiry,
      dte: daysUntilExpiry(expiry),
      legCount: bucket.length,
      shortContracts,
      longContracts,
      itmShortCount,
      unpricedShortCount,
      symbols: Array.from(symbols).sort(),
      instanceCount: instances.size,
      tightestCushionPct,
    })
  }

  return rows.sort((a, b) => a.expiry.localeCompare(b.expiry))
}



// ── Ordering the book by what needs attention ────────────────────────────────

/**
 * Sort key for instances: the most dangerous first.
 *
 * The table was sorted by instance label, so the row that could be assigned
 * tonight sat wherever the alphabet put it. Tiers, in order:
 *
 *   0  a short leg is already in the money
 *   1  short legs exist but none could be priced — unknown is not safe
 *   2  priced and out of the money, tightest cushion first
 *   3  no short legs at all
 *
 * Within a tier, nearer expiry first. Returns a comparator result.
 */
export function compareInstanceRisk(
  a: { cushion: CushionSummary; expiry: ExpirySummary },
  b: { cushion: CushionSummary; expiry: ExpirySummary },
): number {
  const tier = (x: { cushion: CushionSummary }): number => {
    if (x.cushion.shortLegCount === 0) return 3
    if (x.cushion.itmShortCount > 0) return 0
    if (x.cushion.cushionPct == null) return 1
    return 2
  }
  const ta = tier(a)
  const tb = tier(b)
  if (ta !== tb) return ta - tb
  if (ta === 0 || ta === 2) {
    const ca = a.cushion.cushionPct ?? 0
    const cb = b.cushion.cushionPct ?? 0
    if (ca !== cb) return ca - cb
  }
  const da = a.expiry.dte ?? Number.MAX_SAFE_INTEGER
  const db = b.expiry.dte ?? Number.MAX_SAFE_INTEGER
  return da - db
}
