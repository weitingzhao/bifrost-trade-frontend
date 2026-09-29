/**
 * Playbook › Record · By source and By lens (design Rev .112, from the retired
 * Portfolio › Outcome): where the idea behind each closed trade came from.
 *
 * Source is the plan's, in the server's five values (Owner, Rev .108); a trade
 * no plan names reads "No plan" rather than being folded into Manual. Lens and
 * the backtest run have no store (`ORIGIN_UNRECORDED`), so the lens cut is one
 * honest row and vs backtest is — everywhere.
 *
 * Closed trades only: an open one stays out of every rate, as on the play cut.
 */
import type { ReviewInstance } from '@/utils/reviewInstances'
import { PLAN_SOURCE_KINDS, PLAN_SOURCE_LABELS, PLAN_SOURCE_SUBS, type TradeOrigin } from '@/utils/tradeOrigin'

/** Under this many closes a count is a tally, not a rate (the design's floor). */
export const ORIGIN_SAMPLE_FLOOR = 20

export interface OriginRow {
  key: string
  name: string
  sub: string
  n: number
  wins: number
  /** Null under the floor: the row reads "x of n" instead. */
  hitRate: number | null
  realised: number
  avg: number | null
  worst: number | null
  /** Realised average minus the linked run's average per event; null with no run. */
  vsBacktest: number | null
  thin: boolean
}

function originRowOf(key: string, name: string, sub: string, trades: readonly ReviewInstance[]): OriginRow {
  const n = trades.length
  const realised = trades.reduce((a, t) => a + t.realised, 0)
  const wins = trades.filter((t) => t.realised > 0).length
  const thin = n < ORIGIN_SAMPLE_FLOOR
  return {
    key,
    name,
    sub,
    n,
    wins,
    hitRate: n === 0 || thin ? null : wins / n,
    realised,
    avg: n ? realised / n : null,
    worst: n ? Math.min(...trades.map((t) => t.realised)) : null,
    vsBacktest: null,
    thin,
  }
}

/** Every source the server knows, then the trades no plan names — the design's order, "No plan" last. */
export function sourceRows(
  closed: readonly ReviewInstance[],
  origins: ReadonlyMap<number, TradeOrigin>,
): OriginRow[] {
  const originOf = (t: ReviewInstance) => (t.tradeId == null ? undefined : origins.get(t.tradeId))
  const rows = PLAN_SOURCE_KINDS.map((k) =>
    originRowOf(k, PLAN_SOURCE_LABELS[k], PLAN_SOURCE_SUBS[k], closed.filter((t) => originOf(t)?.sourceKind === k)),
  )
  rows.push(originRowOf('none', 'No plan', 'no plan names the trade, so nothing records its source', closed.filter((t) => !originOf(t))))
  return rows
}

/** One row: nothing records a lens, so every closed trade is one whose screen is unknown. */
export function lensRows(closed: readonly ReviewInstance[]): OriginRow[] {
  return [originRowOf('none', 'no lens recorded', 'no plan or trade field holds the screen an idea came through', closed)]
}
