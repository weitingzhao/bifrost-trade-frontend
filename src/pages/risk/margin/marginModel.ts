/**
 * Who is using the margin, and what closing something buys back.
 *
 * The broker reports margin per account and never per position, so the design's
 * "maintenance per name" column has no source. What the model service does
 * report is the capital each underlying has *committed* — what the structure
 * ties up until it is closed — and that is the honest answer to "what does
 * closing this buy back". It is not maintenance margin and the page says so
 * rather than letting one be read as the other.
 *
 * The account figures themselves are the broker's own, rolled up by the same
 * util the Positions cockpit uses (§14.2).
 */
import type { UnderlyingEntry } from '@/types/modelAnalysis'

export interface MarginUser {
  symbol: string
  /** What the structure ties up until it is closed, from the model service. */
  committed: number
  /** What it can lose, capped — null when the risk is unbounded. */
  atRisk: number | null
  /** `defined`, `unlimited`, … in the service's own word. */
  riskType: string
  /** Its share of the committed capital this page can see. */
  share: number
  /** The service could not bound this one's loss. */
  unbounded: boolean
}

export const MARGIN_UNRECORDED = {
  perPosition:
    'The broker reports margin per account, never per position, so no name here carries a maintenance figure. Committed capital is the adjacent reading the model service does report — what the structure ties up — and it is not the same quantity.',
  stressed:
    'Margin under a shock needs the broker to re-run its own requirement at the shocked price. The account summary carries a look-ahead figure for the next session, which is not the same thing, and nothing re-prices the requirement itself.',
  calls:
    'The account summary has no margin-call field. That a call is not shown here is not evidence there is none — it is evidence this page cannot see one.',
} as const

/**
 * Committed capital per underlying, largest first.
 *
 * One symbol held in two accounts is one name to a reader, so the commitments
 * are summed. A name the service could not bound carries `unbounded` rather
 * than a number standing in for infinity.
 */
export function marginUsers(entries: readonly UnderlyingEntry[]): MarginUser[] {
  const by = new Map<string, MarginUser>()
  for (const u of entries) {
    const symbol = (u.symbol ?? '').trim().toUpperCase()
    if (!symbol) continue
    const committed = Number(u.capital_committed ?? 0) || 0
    const car = u.capital_at_risk
    const effective = car && typeof car === 'object' ? Number(car.effective ?? 0) || 0 : 0
    const unbounded = Boolean(car && typeof car === 'object' && car.has_unbounded)
    const prev = by.get(symbol)
    by.set(symbol, {
      symbol,
      committed: (prev?.committed ?? 0) + committed,
      atRisk: unbounded || prev?.atRisk == null ? (unbounded ? null : (prev?.atRisk ?? 0) + effective) : prev.atRisk + effective,
      riskType: prev?.riskType ?? (u.risk_type ?? '').trim(),
      share: 0,
      unbounded: Boolean(prev?.unbounded) || unbounded,
    })
  }
  const rows = [...by.values()].filter((r) => r.committed > 0 || r.unbounded)
  const total = rows.reduce((a, r) => a + r.committed, 0)
  for (const r of rows) r.share = total > 0 ? r.committed / total : 0
  return rows.sort((a, b) => b.committed - a.committed)
}

/** What the rows add up to, and how much of the book could not be bounded. */
export function marginUsersTotal(rows: readonly MarginUser[]): { committed: number; unbounded: number } {
  return {
    committed: rows.reduce((a, r) => a + r.committed, 0),
    unbounded: rows.filter((r) => r.unbounded).length,
  }
}
