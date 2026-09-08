/**
 * A symbol's exhibits in one request — the regime row's lamps, the Dossier's
 * faces. One round trip instead of one per lens, and the answers are seeded
 * into the per-lens cache the hub sections read, so a batch warms every hub
 * and a hub's own reading is never fetched twice.
 */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExhibitComposite, type ExhibitPayload } from '@/api/research/exhibit'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { EXHIBIT_STALE_MS } from '@/hooks/useLensRegistry'

export function useExhibitComposite(lenses: readonly string[], symbol: string) {
  const sym = (symbol || '').trim().toUpperCase()
  const requested = lenses.join(',')
  const qc = useQueryClient()
  const q = useQuery<ExhibitPayload[]>({
    queryKey: QUERY_KEYS.research.exhibitComposite(sym, requested),
    queryFn: () => fetchExhibitComposite(lenses, sym),
    enabled: sym.length > 0,
    staleTime: EXHIBIT_STALE_MS,
  })
  useEffect(() => {
    if (!q.data) return
    for (const ex of q.data) {
      // Under the name it was asked for, and under its registry id when the
      // two differ (the ribbon asks for `terrain`, the lab reads `terrain_regime`).
      qc.setQueryData(QUERY_KEYS.research.exhibit(ex.lens, sym), ex)
      if (ex.lens_id && ex.lens_id !== ex.lens) {
        qc.setQueryData(QUERY_KEYS.research.exhibit(ex.lens_id, sym), ex)
      }
    }
  }, [q.data, qc, sym])
  return q
}
