/**
 * The lens registry and a lens' exhibit, as TanStack queries.
 *
 * The registry is read once and kept for the session (it changes with
 * releases); an exhibit is a live reading and is refreshed like the lab data
 * it summarises.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchLensRegistry, type LensRegistry, type LensSpec } from '@/api/research/lenses'
import { fetchExhibit, type ExhibitLens, type ExhibitPayload } from '@/api/research/exhibit'
import { QUERY_KEYS } from '@/constants/queryKeys'

const REGISTRY_STALE_MS = 60 * 60_000
export const EXHIBIT_STALE_MS = 60_000

export function useLensRegistry() {
  return useQuery<LensRegistry>({
    queryKey: QUERY_KEYS.research.lenses,
    queryFn: fetchLensRegistry,
    staleTime: REGISTRY_STALE_MS,
  })
}

/** One registry entry, or undefined until the registry has loaded. */
export function useLensSpec(lensId: string): LensSpec | undefined {
  const q = useLensRegistry()
  return q.data?.lenses.find((l) => l.id === lensId)
}

export function useExhibit(lens: ExhibitLens, symbol: string) {
  const sym = (symbol || '').trim().toUpperCase()
  return useQuery<ExhibitPayload>({
    queryKey: QUERY_KEYS.research.exhibit(lens, sym),
    queryFn: () => fetchExhibit(lens, sym),
    enabled: sym.length > 0,
    staleTime: EXHIBIT_STALE_MS,
  })
}
