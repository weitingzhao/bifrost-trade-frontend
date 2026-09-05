/**
 * One row per account × symbol: what the options on that name demand, and
 * what the same account holds against them.
 *
 * The three Coverage panels split this across screens — cash for the puts in
 * one, shares behind the calls in another, spare cover in a third — so the
 * question a seller actually asks ("what does MU in the host account owe, and
 * is anything left to sell?") had to be reassembled by eye. This is the shape
 * of a single table that answers it. The page computes the rows; this file
 * holds only the type and the sort, so the table cannot re-derive a number
 * and quietly disagree with the gauges above it.
 *
 * Cover is same-account and same-symbol. A share in the secondary account
 * does not back a call written from the host, and the page is expected to
 * have already split rows on that boundary rather than pooling them.
 */

export interface ObligationsRow {
  accountId: string
  symbol: string
  /** Short put contracts on this name in this account. */
  shortPuts: number
  /** Strike notional a full put assignment would take, in dollars. */
  cashIfAssigned: number
  /** Short calls with same-account shares behind them. */
  coveredCalls: number
  /** Short calls with nothing behind them. */
  nakedCalls: number
  /** Whole long shares held; fractional remainders cannot back a contract. */
  sharesHeld: number
  /** Shares currently committed to covered calls. */
  sharesBacking: number
  /** Shares held and not yet spoken for. */
  sharesSpare: number
  /** Whole contracts the spare shares could still back. */
  moreCalls: number
  avgCost: number | null
  price: number | null
  marketValue: number | null
  dailyPnl: number | null
  totalPnl: number | null
}

export type ObligationsSort = 'cash' | 'calls' | 'spare' | 'symbol'

/**
 * Sort is stable and never mutates: the page groups the result by account
 * afterwards, and a row that ties on the sort key keeps the order it arrived
 * in. `calls` ranks by total short calls and breaks ties naked-first, because
 * two names carrying ten calls each are not the same when one of them has
 * nothing behind it.
 */
export function sortObligations(
  rows: readonly ObligationsRow[],
  sort: ObligationsSort,
): ObligationsRow[] {
  const out = [...rows]
  switch (sort) {
    case 'cash':
      out.sort((a, b) => b.cashIfAssigned - a.cashIfAssigned)
      break
    case 'calls':
      out.sort((a, b) => {
        const total = b.coveredCalls + b.nakedCalls - (a.coveredCalls + a.nakedCalls)
        return total !== 0 ? total : b.nakedCalls - a.nakedCalls
      })
      break
    case 'spare':
      out.sort((a, b) => b.moreCalls - a.moreCalls)
      break
    case 'symbol':
      out.sort((a, b) => a.symbol.localeCompare(b.symbol))
      break
  }
  return out
}
