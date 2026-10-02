import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postWatchlistItem, deleteWatchlistItem, patchWatchlistItem, type WatchlistItemPatch } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { notify } from '@/lib/shellNotify'
import type { WatchlistItem } from '@/types/market'

function invalidateWatchlist(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: QUERY_KEYS.research.watchlist })
}

/** A refused write says why (the server's `detail`), wherever it was asked from. */
function watchlistRefused(e: unknown) {
  notify(`Watchlist not saved — ${e instanceof Error ? e.message : String(e)}`)
}

export function useWatchlistMutations() {
  const qc = useQueryClient()

  const addItem = useMutation({
    mutationFn: postWatchlistItem,
    onSuccess: () => invalidateWatchlist(qc),
    onError: watchlistRefused,
  })

  const removeItem = useMutation({
    mutationFn: (contractKey: string) => deleteWatchlistItem(contractKey),
    onSuccess: () => invalidateWatchlist(qc),
    onError: watchlistRefused,
  })

  /**
   * PATCH /watchlist/{contract_key} with only what changed (api 0.3.0) — the
   * list it is in, or optionable. `category_id: null` is sent as null: the
   * None list. Nothing else on the row is resent, so nothing else can move.
   */
  const updateItem = useMutation({
    mutationFn: ({ contractKey, patch }: { contractKey: string; patch: WatchlistItemPatch }) =>
      patchWatchlistItem(contractKey, patch),
    onSuccess: () => invalidateWatchlist(qc),
    onError: watchlistRefused,
  })

  // The refusal is already shown (onError); the caller's promise settles quietly.
  const upsertFromItem = (item: WatchlistItem, patch: Pick<Partial<WatchlistItem>, 'category_id' | 'optionable'>) => {
    const body: WatchlistItemPatch = {}
    if (patch.category_id !== undefined) body.category_id = patch.category_id
    if (patch.optionable !== undefined) body.optionable = patch.optionable
    if (Object.keys(body).length === 0) return Promise.resolve(undefined)
    return updateItem.mutateAsync({ contractKey: item.contract_key, patch: body }).catch(() => undefined)
  }

  return { addItem, removeItem, updateItem, upsertFromItem }
}
