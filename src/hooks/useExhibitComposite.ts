/**
 * A symbol's exhibits in one request — the regime row's lamps, the Dossier's
 * faces. One round trip instead of one per lens, and the answers are seeded
 * into the per-lens cache the hub sections read, so a batch warms every hub
 * and a hub's own reading is never fetched twice.
 *
 * The same answer carries the name's option listing (research 0.193.0,
 * TD-159); `useCompositeOptionListing` reads it from the same cache entry.
 */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchExhibitComposite,
  type ExhibitComposite,
  type ExhibitPayload,
  type OptionListing,
} from '@/api/research/exhibit'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { EXHIBIT_STALE_MS } from '@/hooks/useLensRegistry'

function compositeQuery(lenses: readonly string[], sym: string) {
  return {
    queryKey: QUERY_KEYS.researchEngine.exhibitComposite(sym, lenses.join(',')),
    queryFn: () => fetchExhibitComposite(lenses, sym),
    enabled: sym.length > 0,
    staleTime: EXHIBIT_STALE_MS,
  }
}

const selectExhibits = (d: ExhibitComposite): ExhibitPayload[] => d.exhibits
const selectListing = (d: ExhibitComposite): OptionListing | null | undefined => d.optionListing

export function useExhibitComposite(lenses: readonly string[], symbol: string) {
  const sym = (symbol || '').trim().toUpperCase()
  const qc = useQueryClient()
  const q = useQuery({ ...compositeQuery(lenses, sym), select: selectExhibits })
  useEffect(() => {
    if (!q.data) return
    for (const ex of q.data) {
      // Under the name it was asked for, and under its registry id when the
      // two differ (the ribbon asks for `terrain`, the lab reads `terrain_regime`).
      qc.setQueryData(QUERY_KEYS.researchEngine.exhibit(ex.lens, sym), ex)
      if (ex.lens_id && ex.lens_id !== ex.lens) {
        qc.setQueryData(QUERY_KEYS.researchEngine.exhibit(ex.lens_id, sym), ex)
      }
    }
  }, [q.data, qc, sym])
  return q
}

/** The option listing from the same batch — no second request when the lenses match a loaded batch. */
export function useCompositeOptionListing(lenses: readonly string[], symbol: string) {
  const sym = (symbol || '').trim().toUpperCase()
  return useQuery({ ...compositeQuery(lenses, sym), select: selectListing })
}
