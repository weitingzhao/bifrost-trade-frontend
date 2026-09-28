import { useQuery } from '@tanstack/react-query'
import { fetchInstanceExecutions } from '@/api/trading'

/**
 * The underlying an instance trades, from its own fills — what a page landing
 * on `?inst=` narrows its symbol filter to, so the instance is not filtered out
 * of the view it was sent to. Null when it has no fill (or none with a symbol).
 */
export function useInstanceRoot(id: number | null) {
  return useQuery({
    queryKey: ['instance-root', id],
    queryFn: async () => {
      const r = await fetchInstanceExecutions(id!)
      const sym = (r.executions ?? []).map((e) => (e.symbol ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? '').find(Boolean)
      return sym ?? null
    },
    enabled: id != null,
    staleTime: 5 * 60_000,
  })
}
