/**
 * The four entities of the rulebook, plus the gates and the fills that tell an
 * instance whether it is still open.
 *
 * Lives beside the page rather than in `hooks/`: one feature reads it, and
 * module-placement-v1 puts a single-consumer module in that feature's folder —
 * which is also what keeps the shared layer from importing back out of
 * `pages/`, the thing the legacy-css gate refuses.
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
import { readInstances, type ChainData } from './rulesChain'

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
    loading: chain.isLoading || execQuery.isLoading,
    error: chain.error ?? execQuery.error ?? null,
    refetch: () => {
      void chain.refetch()
      void execQuery.refetch()
    },
  }
}
