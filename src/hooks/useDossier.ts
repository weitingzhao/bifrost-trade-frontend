/**
 * The dossier's exhibits — one query per registry lens, under the same keys
 * the hubs use, so opening the dossier warms every hub and a hub warms it.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchExhibit, type ExhibitLens, type ExhibitPayload } from '@/api/research/exhibit'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { EXHIBIT_STALE_MS } from '@/hooks/useLensRegistry'
import { DOSSIER_LENSES } from '@/lib/dossier'

export interface DossierExhibits {
  exhibits: ExhibitPayload[]
  /** True until every lens has answered or failed. */
  loading: boolean
  /** The lenses whose exhibit request failed — shown, not swallowed. */
  failed: ExhibitLens[]
}

export function useDossier(symbol: string): DossierExhibits {
  const sym = (symbol || '').trim().toUpperCase()
  const results = useQueries({
    queries: DOSSIER_LENSES.map((lens) => ({
      queryKey: QUERY_KEYS.research.exhibit(lens, sym),
      queryFn: () => fetchExhibit(lens, sym),
      enabled: sym.length > 0,
      staleTime: EXHIBIT_STALE_MS,
    })),
  })
  return {
    exhibits: results.flatMap((r) => (r.data ? [r.data] : [])),
    loading: sym.length > 0 && results.some((r) => r.isPending),
    failed: DOSSIER_LENSES.filter((_, i) => results[i].isError),
  }
}
