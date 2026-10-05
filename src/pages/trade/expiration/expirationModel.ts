/**
 * What expires next, and what each leg is worth if it does.
 *
 * The page's subject is the nearest expiry the book actually holds — not "this
 * Friday", which on most days holds nothing. A leg's mark is the vendor's
 * dated close from the Golden Source, the same snapshot Positions prices its
 * Greeks from (§14.2, one source); the attribution service's own `price_mid`
 * is empty outside the session, so quoting it would make the page blank after
 * the close rather than dated.
 *
 * Three readings the design asks for have no source on this side and say so:
 * pin and flip belong to Dealer Levels, early assignment needs an ex-date feed
 * with future events, and a decision written from here would be a new write
 * path — the page links to Trade Plans instead (D10).
 */
import type { ExpiryLeg } from '@/utils/expiryLegs'


// ── Decisions ────────────────────────────────────────────────────────────────

/**
 * A decision here is scratch until `Create plans` writes it — and what that
 * writes is a *draft Trade Plan* through the same call the Plans form makes,
 * so the plan store keeps its one write path. Choosing in the table is how the
 * settle band gets something to add up; it commits nothing (D10 either way:
 * a plan is copied into TWS by hand).
 */
export type LegDecision = '' | 'roll' | 'close' | 'expire' | 'assign'

/** The design's order: the actions first, the defaults last. */
export const DECISION_OPTIONS: { value: LegDecision; label: string }[] = [
  { value: 'roll', label: 'Roll' },
  { value: 'close', label: 'Close' },
  { value: 'expire', label: 'Expire' },
  { value: 'assign', label: 'Assign' },
]

export interface DecisionEffect {
  text: string
  tone: 'up' | 'down' | 'warn' | 'muted'
}

/** What one leg's chosen path does, at the dated mark this page prices from. */
export function decisionEffect(leg: ExpiryLeg, decision: LegDecision): DecisionEffect {
  const short = leg.qty < 0
  const assignCash = leg.right === 'P' ? leg.strike * 100 * Math.abs(leg.qty) : null
  if (decision === 'close') {
    if (leg.closeCost == null) return { text: 'no mark — cannot price the close', tone: 'muted' }
    return leg.closeCost > 0
      ? { text: `pay ${settleUsd(leg.closeCost)} at the dated mark`, tone: 'down' }
      : { text: `collect ${settleUsd(-leg.closeCost)} at the dated mark`, tone: 'up' }
  }
  if (decision === 'roll') {
    // The vendor snapshot has no bid or ask, so a roll credit quoted here
    // would be yesterday's presented as today's — the draft plan prices it.
    return { text: 'credit quoted on the draft plan', tone: 'muted' }
  }
  if (decision === 'expire' || decision === 'assign') {
    if (leg.itm == null) return { text: 'no spot — cannot say how it settles', tone: 'muted' }
    if (!leg.itm) {
      return decision === 'assign'
        ? { text: 'only if it finishes ITM — it is not today', tone: 'muted' }
        : { text: short ? 'expires worthless — credit kept' : 'expires worthless — debit gone', tone: short ? 'up' : 'down' }
    }
    if (leg.right === 'P' && short) return { text: `assigns — takes ${settleUsd(assignCash ?? 0)} cash`, tone: 'warn' }
    if (leg.right === 'C' && short) return { text: `assigns — delivers ${Math.abs(leg.qty) * 100} sh`, tone: 'warn' }
    return { text: 'finishes ITM — exercised', tone: 'warn' }
  }
  return { text: '—', tone: 'muted' }
}

export interface SettleImpact {
  decided: number
  /** Draft plans `Create plans` would write — one per roll or close. */
  planCount: number
  /** Entry credit kept by short legs left to expire or assign. */
  creditsKept: number
  /** Legs in that set whose entry cost never arrived — counted, not zeroed. */
  creditsUnknown: number
  /** Paid (positive) to close what is chosen closed, at dated marks. */
  closePaid: number
  closeUnpriced: number
  /** Cash short puts would take if the ITM ones chosen to settle assign. */
  assignCash: number
  /** Short ITM calls in that set — they deliver shares, not cash. */
  assignShareLegs: number
  /** θ/day forfeited by the closes, over the legs the vendor matched. */
  thetaLost: number
  thetaUnknown: number
}

export function settleImpact(
  legs: readonly ExpiryLeg[],
  decisions: ReadonlyMap<string, LegDecision>,
): SettleImpact {
  const out: SettleImpact = {
    decided: 0,
    planCount: 0,
    creditsKept: 0,
    creditsUnknown: 0,
    closePaid: 0,
    closeUnpriced: 0,
    assignCash: 0,
    assignShareLegs: 0,
    thetaLost: 0,
    thetaUnknown: 0,
  }
  for (const leg of legs) {
    const d = decisions.get(leg.contractKey) ?? ''
    if (d === '') continue
    out.decided += 1
    if (d === 'roll' || d === 'close') out.planCount += 1
    if (d === 'close') {
      if (leg.closeCost == null) out.closeUnpriced += 1
      else out.closePaid += leg.closeCost
      if (leg.thetaPerDay == null) out.thetaUnknown += 1
      else if (leg.thetaPerDay > 0) out.thetaLost += leg.thetaPerDay
    }
    if ((d === 'expire' || d === 'assign') && leg.qty < 0) {
      if (leg.entryCost == null) out.creditsUnknown += 1
      else out.creditsKept += leg.entryCost
      if (leg.itm) {
        if (leg.right === 'P') out.assignCash += leg.strike * 100 * Math.abs(leg.qty)
        else if (leg.right === 'C') out.assignShareLegs += 1
      }
    }
  }
  return out
}

function settleUsd(v: number): string {
  return `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
}


/** Inside this many days, a leg is the desk's business rather than the ladder's. */
export const EXPIRATION_NEAR_DAYS = 7

export const EXPIRATION_UNRECORDED = {
  pin: 'Pin and flip are Dealer Levels’ computation. That page is not built, and a second computation of the same level would disagree with it eventually.',
  assign:
    'Early assignment turns on a dividend falling before expiry. The corporate-action feed carries no future ex-date for any symbol in this book, so nothing here can say a leg is at risk — or that it is safe.',
  decide:
    'A decision in the table is scratch until Create plans writes it — and what that writes is a draft Trade Plan, through the same call the Plans form makes, so the plan store keeps its one write path. Undecided legs are outside the settle numbers, not assumed to expire.',
  roll: 'A roll candidate needs a quote on the target contract. The vendor snapshot carries a dated close but no bid or ask, so a credit quoted from it would be yesterday’s, presented as today’s.',
} as const
