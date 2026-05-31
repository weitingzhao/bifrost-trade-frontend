import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postWatchlistItem, deleteWatchlistItem } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { WatchlistItem } from '@/types/market'

function invalidateWatchlist(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: QUERY_KEYS.research.watchlist })
}

export function useWatchlistMutations() {
  const qc = useQueryClient()

  const addItem = useMutation({
    mutationFn: postWatchlistItem,
    onSuccess: () => invalidateWatchlist(qc),
  })

  const removeItem = useMutation({
    mutationFn: (contractKey: string) => deleteWatchlistItem(contractKey),
    onSuccess: () => invalidateWatchlist(qc),
  })

  const updateItem = useMutation({
    mutationFn: postWatchlistItem,
    onSuccess: () => invalidateWatchlist(qc),
  })

  const upsertFromItem = (item: WatchlistItem, patch: Partial<WatchlistItem>) =>
    updateItem.mutateAsync({
      contract_key: item.contract_key,
      symbol: item.symbol,
      sec_type: item.sec_type,
      expiry: item.expiry ?? undefined,
      strike: item.strike ?? undefined,
      option_right: item.option_right ?? undefined,
      display_label: item.display_label ?? undefined,
      source: item.source,
      category_id: patch.category_id !== undefined ? patch.category_id : item.category_id,
      optionable: patch.optionable !== undefined ? patch.optionable : item.optionable,
    })

  return { addItem, removeItem, updateItem, upsertFromItem }
}
