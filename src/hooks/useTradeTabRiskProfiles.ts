import { useMemo } from 'react'
import type { TradeAllGroup, Execution, PositionTradeAttribution } from '@/types/positions'
import type { StrategyOpportunity, StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { RiskProfile } from '@/utils/riskProfile'
import { computeTradeDetailRiskProfileForGroup } from '@/utils/tradeDetail/riskProfile'

export function useTradeTabRiskProfiles(
  groups: TradeAllGroup[],
  executionsFinal: Execution[],
  tradeStructureById: ReadonlyMap<number, number | null | undefined>,
  attributions: PositionTradeAttribution[],
  opportunities: StrategyOpportunity[],
  structures: StrategyStructure[],
  portfolioAccounts: IbAccountSnapshot[] | undefined,
): Map<number, RiskProfile | null> {
  return useMemo(() => {
    const structureMap = new Map(structures.map((s) => [s.strategy_structure_id, s]))
    const map = new Map<number, RiskProfile | null>()
    for (const g of groups) {
      const id = g.trade_id
      if (id == null) continue
      map.set(
        id,
        computeTradeDetailRiskProfileForGroup(
          g,
          executionsFinal,
          tradeStructureById,
          attributions,
          opportunities,
          structureMap,
          portfolioAccounts,
        ),
      )
    }
    return map
  }, [
    groups,
    executionsFinal,
    tradeStructureById,
    attributions,
    opportunities,
    structures,
    portfolioAccounts,
  ])
}
