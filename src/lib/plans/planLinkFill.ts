/**
 * Which open instances can be offered as a fill for a plan.
 *
 * Instances have no symbol column. The opportunity they belong to does: the API
 * field is `symbols` (the table stores `symbols_json`). Matching on the instance
 * label would treat "MU" as a substring of any name that happens to contain it.
 */
import type { Trade } from '@/types/strategy'

export type OpportunitySymbols = {
  strategy_opportunity_id: number
  /** Null in the opportunity list when it has none. */
  symbols: string[] | null
}

export function tradesTradingSymbol(
  trades: readonly Trade[],
  opportunities: readonly OpportunitySymbols[],
  symbol: string,
): Trade[] {
  const wanted = symbol.trim().toUpperCase()
  if (!wanted) return []
  const byOpp = new Map<number, Set<string>>()
  for (const opp of opportunities) {
    byOpp.set(
      opp.strategy_opportunity_id,
      new Set((opp.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
    )
  }
  return trades.filter((row) => byOpp.get(row.strategy_opportunity_id)?.has(wanted) === true)
}
