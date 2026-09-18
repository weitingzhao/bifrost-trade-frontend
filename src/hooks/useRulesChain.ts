/**
 * The four entities of the rulebook, plus the gates and the fills that tell an
 * instance whether it is still open.
 *
 * Shared since 2026-09-18: Trade › Rules draws the chain and Trade › Desk
 * reads what is in force from the same five rows, so it sits in `hooks/` under
 * one query key and the two pages cannot disagree about which allocation the
 * daemon is on. `ChainData` travels with it rather than with the column
 * builder, which keeps the shared layer from importing back out of `pages/`.
 *
 * Five reads, all small — the largest is 87 instances — so they resolve
 * together rather than per column: a chain drawn one column at a time would
 * show a lineage that is still arriving, and a half-lit lineage reads as a
 * broken link rather than a loading state.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchAllocations,
  fetchGateSafety,
  fetchOpportunities,
  fetchStrategyInstances,
  fetchStructures,
} from '@/api/strategy'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { readInstances, type InstanceReading } from '@/utils/strategyInstances'
import type {
  GateSafetyItem,
  StrategyAllocation,
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/strategy'

/** The rulebook's five rows, as both pages read them. */
export interface ChainData {
  structures: readonly StrategyStructure[]
  opportunities: readonly StrategyOpportunity[]
  allocations: readonly StrategyAllocation[]
  gates: readonly GateSafetyItem[]
  instances: readonly InstanceReading[]
}

const EMPTY: Omit<ChainData, 'instances'> & { rawInstances: [] } = {
  structures: [],
  opportunities: [],
  allocations: [],
  gates: [],
  rawInstances: [],
}

export function useRulesChain() {
  const chain = useQuery({
    queryKey: ['trade', 'rulesChain'],
    staleTime: 60_000,
    queryFn: async () => {
      const [structures, opportunities, allocations, gates, instances] = await Promise.all([
        fetchStructures(),
        fetchOpportunities(),
        fetchAllocations(),
        fetchGateSafety(),
        fetchStrategyInstances(),
      ])
      return {
        structures: structures.items,
        opportunities: opportunities.items,
        allocations: allocations.items,
        gates: gates.items,
        rawInstances: instances.items,
      }
    },
  })

  const execQuery = useExecutionsCanonical()
  const raw = chain.data ?? EMPTY

  const data: ChainData = useMemo(
    () => ({
      structures: raw.structures,
      opportunities: raw.opportunities,
      allocations: raw.allocations,
      gates: raw.gates,
      instances: readInstances(raw.rawInstances, execQuery.data?.items ?? []),
    }),
    [raw, execQuery.data?.items],
  )

  return {
    data,
    /** The server's own instance records — what a delete sheet needs to act on. */
    rawInstances: raw.rawInstances,
    loading: chain.isLoading || execQuery.isLoading,
    error: chain.error ?? execQuery.error ?? null,
    refetch: () => {
      void chain.refetch()
      void execQuery.refetch()
    },
  }
}
