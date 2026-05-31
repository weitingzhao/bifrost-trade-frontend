import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createPositionCategory } from '@/api/portfolio'
import { usePositionCategories } from '@/hooks/usePositionCategories'
import {
  categoryIdForName,
  WL_CAT_SIZING,
  WL_CAT_WATCHING,
} from '@/utils/watchlistHelpers'

/** Ensures Watching / Sizing categories exist (same DB as Portfolio → Accounts). */
export function useEnsureWatchlistCategories() {
  const { data } = usePositionCategories()
  const qc = useQueryClient()
  const attempted = useRef(false)

  const categories = data?.items ?? []
  const watchingId = categoryIdForName(categories, WL_CAT_WATCHING)
  const sizingId = categoryIdForName(categories, WL_CAT_SIZING)

  useEffect(() => {
    if (categories.length === 0) return
    if (watchingId != null && sizingId != null) return
    if (attempted.current) return
    attempted.current = true

    let cancelled = false
    ;(async () => {
      try {
        if (watchingId == null) await createPositionCategory(WL_CAT_WATCHING, 2)
        if (!cancelled && sizingId == null) await createPositionCategory(WL_CAT_SIZING, 3)
        if (!cancelled) {
          await qc.invalidateQueries({ queryKey: ['portfolio', 'position-categories'] })
        }
      } catch {
        /* keep existing categories */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [categories.length, watchingId, sizingId, qc])

  return { watchingId, sizingId, categories }
}
