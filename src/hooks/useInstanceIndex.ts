import { useQuery } from '@tanstack/react-query'
import { fetchStrategyInstances } from '@/api/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StrategyInstancesResponse } from '@/types/strategy'

// Module-level so every token on a page shares one Set per response, not one per render.
const toIds = (r: StrategyInstancesResponse) => new Set(r.items.map((i) => i.strategy_instance_id))

/** The ids the book holds — the same read as the unfiltered instance list, without its polling. */
export function useInstanceIndex(): ReadonlySet<number> | null {
  const q = useQuery({
    queryKey: [...QUERY_KEYS.strategy.instances, null, null, null],
    queryFn: () => fetchStrategyInstances(),
    staleTime: 60_000,
    select: toIds,
  })
  return q.data ?? null
}
