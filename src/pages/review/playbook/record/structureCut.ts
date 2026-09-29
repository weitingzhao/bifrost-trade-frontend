/**
 * The structure cut — Strategy › Win Rate, merged in.
 *
 * Design DECISIONS 2026-09-18 folded Win Rate into this page as a grouping
 * switch rather than a row beside it: *what each play has done* and *what each
 * shape has done* are the same question asked of two different groupings, and a
 * page that answered only one of them kept sending the reader somewhere else.
 *
 * ## The two cuts do not share a computation, and must not pretend to
 *
 * The **play** cut is the Ledger's: closed option contracts the fills have
 * taken flat, grouped by the opportunity name the fills carry. The
 * **structure** cut is the strategy service's: closed *instances* with
 * executions, grouped by structure, with its own formulas for investment and
 * max risk.
 *
 * They therefore disagree, and the disagreement is not an error to reconcile.
 * Measured on DEV 2026-09-18: 67 closed trades over 19 plays on one side, 85
 * closed instances over 6 structures on the other. An instance can hold several
 * contracts; a contract can be closed without its instance being flat. The page
 * says which service it is reading and never averages the two.
 *
 * Every figure here is quoted from the service, never recomputed — including
 * the totals row, which the service returns rather than this page summing. A
 * total summed here would drift from the service's own the moment either
 * changed its definition of investment.
 */
import type { WinRateStructureRow } from '@/types/strategy'

export interface StructureRow {
  key: string
  name: string
  /** True for the service's own totals row, which leads the table. */
  totals: boolean
  n: number
  wins: number
  losses: number
  /** Wins over the instances that resolved either way. Null when none did. */
  winRate: number | null
  totalProfit: number | null
  totalLoss: number | null
  avgWinUsd: number | null
  avgWinPct: number | null
  avgLossUsd: number | null
  avgLossPct: number | null
  invested: number | null
  investedWin: number | null
  investedLoss: number | null
  maxRisk: number | null
  returnPct: number | null
  worstPct: number | null
}

function toRow(r: WinRateStructureRow, totals: boolean): StructureRow {
  const resolved = r.profit_trades + r.loss_trades
  return {
    key: `${totals ? 'totals' : 'structure'}:${r.structure_name}`,
    name: r.structure_name,
    totals,
    n: r.total_instances,
    wins: r.profit_trades,
    losses: r.loss_trades,
    // Over what resolved, not over `n`: an instance that is open has not won or
    // lost, and counting it in the denominator quietly depresses every rate.
    winRate: resolved === 0 ? null : r.profit_trades / resolved,
    totalProfit: r.total_profit,
    totalLoss: r.total_loss,
    avgWinUsd: r.profit_avg_usd,
    avgWinPct: r.profit_avg_pct,
    avgLossUsd: r.loss_avg_usd,
    avgLossPct: r.loss_avg_pct,
    invested: r.total_investment,
    investedWin: r.profit_investment,
    investedLoss: r.loss_investment,
    maxRisk: r.total_max_risk,
    returnPct: r.structure_return_pct,
    worstPct: r.single_max_loss_pct,
  }
}

/**
 * The service's rows, totals first.
 *
 * Totals lead rather than trail because the question the page is asked first is
 * "how is the book doing" and only then "which shape is carrying it".
 */
export function structureRows(
  structures: readonly WinRateStructureRow[],
  totals: WinRateStructureRow | null | undefined,
): StructureRow[] {
  const body = structures.map((r) => toRow(r, false)).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
  return totals == null ? body : [toRow(totals, true), ...body]
}

/**
 * A structure the service returns with nothing in it.
 *
 * Kept rather than filtered: a shape that exists and has never been traded is a
 * reading — it is the difference between a rulebook entry nobody uses and one
 * that does not exist.
 */
export function neverTraded(rows: readonly StructureRow[]): StructureRow[] {
  return rows.filter((r) => !r.totals && r.n === 0)
}

/** How the two cuts disagree, stated rather than reconciled. */
export function cutDisagreement(
  plays: number,
  closedTrades: number,
  structures: number,
  instances: number,
): string {
  return (
    `The two cuts count different things and do not reconcile: ${closedTrades} closed contracts over ${plays} plays ` +
    `on the Ledger's side, ${instances} closed instances over ${structures} structures on the strategy service's. ` +
    'An instance can hold several contracts, and a contract can be flat while its instance is not. Neither number is ' +
    'wrong and neither is the other one adjusted.'
  )
}
