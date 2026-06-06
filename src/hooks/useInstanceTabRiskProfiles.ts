import { useMemo } from 'react'
import type { InstanceAllGroup, Execution, PositionInstanceAttribution } from '@/types/positions'
import type { StrategyOpportunity, StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { RiskProfile } from '@/utils/riskProfile'
import { computeInstanceDetailRiskProfileForGroup } from '@/utils/instanceDetail/riskProfile'

export function useInstanceTabRiskProfiles(
  groups: InstanceAllGroup[],
  executionsFinal: Execution[],
  instanceStructureById: ReadonlyMap<number, number | null | undefined>,
  attributions: PositionInstanceAttribution[],
  opportunities: StrategyOpportunity[],
  structures: StrategyStructure[],
  portfolioAccounts: IbAccountSnapshot[] | undefined,
): Map<number, RiskProfile | null> {
  return useMemo(() => {
    const structureMap = new Map(structures.map((s) => [s.strategy_structure_id, s]))
    const map = new Map<number, RiskProfile | null>()
    for (const g of groups) {
      const id = g.strategy_instance_id
      if (id == null) continue
      map.set(
        id,
        computeInstanceDetailRiskProfileForGroup(
          g,
          executionsFinal,
          instanceStructureById,
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
    instanceStructureById,
    attributions,
    opportunities,
    structures,
    portfolioAccounts,
  ])
}
