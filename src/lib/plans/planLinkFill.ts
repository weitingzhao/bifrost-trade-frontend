/**
 * Which open instances can be offered as a fill for a plan.
 *
 * Instances have no symbol column. The opportunity they belong to does: the API
 * field is `symbols` (the table stores `symbols_json`). Matching on the instance
 * label would treat "MU" as a substring of any name that happens to contain it.
 */
import type { StrategyInstance } from '@/types/strategy'

export type OpportunitySymbols = {
  strategy_opportunity_id: number
  symbols: string[]
}

export function instancesTradingSymbol(
  instances: readonly StrategyInstance[],
  opportunities: readonly OpportunitySymbols[],
  symbol: string,
): StrategyInstance[] {
  const wanted = symbol.trim().toUpperCase()
  if (!wanted) return []
  const byOpp = new Map<number, Set<string>>()
  for (const opp of opportunities) {
    byOpp.set(
      opp.strategy_opportunity_id,
      new Set((opp.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
    )
  }
  return instances.filter((row) => byOpp.get(row.strategy_opportunity_id)?.has(wanted) === true)
}
