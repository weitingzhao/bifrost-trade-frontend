import { useMemo, useCallback } from 'react'
import type { StatusResponse } from '@/types/monitor'
import type { WatchlistItem } from '@/types/market'
import {
  WL_CAT_SIZING,
  WL_CAT_WATCHING,
  categoryIdForName,
  isStockRow,
  isUncategorizedOption,
  isUncategorizedStock,
  itemMatchesCategory,
  positionToContractKey,
  symbolFromItem,
} from '@/utils/watchlistHelpers'
import type { PositionCategory } from '@/types/portfolio'

export function useWatchlistWorkflow(
  items: WatchlistItem[],
  categories: PositionCategory[],
  status: StatusResponse | null | undefined,
) {
  const watchingCategoryId = useMemo(
    () => categoryIdForName(categories, WL_CAT_WATCHING),
    [categories],
  )
  const sizingCategoryId = useMemo(
    () => categoryIdForName(categories, WL_CAT_SIZING),
    [categories],
  )

  const positions = useMemo(
    () => (status?.portfolio?.accounts ?? []).flatMap(acc => acc.positions ?? []),
    [status?.portfolio?.accounts],
  )

  const contractKeysWithPosition = useMemo(
    () => new Set(positions.map(p => positionToContractKey(p))),
    [positions],
  )

  const watchlistContractKeys = useMemo(
    () => new Set(items.map(w => w.contract_key)),
    [items],
  )

  const positionsNotInWatchlist = useMemo(() => {
    return positions.filter(p => {
      const st = (p.secType ?? '').toString().trim().toUpperCase()
      if (st !== 'STK' && st !== '') return false
      return !watchlistContractKeys.has(positionToContractKey(p))
    })
  }, [positions, watchlistContractKeys])

  const allStocks = useMemo(
    () => items.filter(w => isStockRow(w)),
    [items],
  )
  const watchlistOptions = useMemo(
    () => items.filter(w => (w.sec_type || '').toUpperCase() === 'OPT'),
    [items],
  )

  const hasPosition = useCallback(
    (item: WatchlistItem) => contractKeysWithPosition.has(item.contract_key.trim()),
    [contractKeysWithPosition],
  )

  const matchesWatching = useCallback(
    (item: WatchlistItem) => itemMatchesCategory(item, WL_CAT_WATCHING, watchingCategoryId),
    [watchingCategoryId],
  )
  const matchesSizing = useCallback(
    (item: WatchlistItem) => itemMatchesCategory(item, WL_CAT_SIZING, sizingCategoryId),
    [sizingCategoryId],
  )

  const watchingStockRows = useMemo(
    () =>
      allStocks.filter(s => {
        if (matchesSizing(s)) return false
        if (matchesWatching(s)) return true
        if (isUncategorizedStock(s)) return true
        return false
      }),
    [allStocks, matchesSizing, matchesWatching],
  )

  const otherCategoryStockRows = useMemo(
    () =>
      allStocks.filter(s => {
        if (matchesWatching(s) || matchesSizing(s)) return false
        if (isUncategorizedStock(s)) return false
        return true
      }),
    [allStocks, matchesSizing, matchesWatching],
  )

  const sizingStockRows = useMemo(
    () => allStocks.filter(s => matchesSizing(s)),
    [allStocks, matchesSizing],
  )

  const positionStockRows = useMemo(
    () => allStocks.filter(hasPosition),
    [allStocks, hasPosition],
  )
  const positionOptRows = useMemo(
    () => watchlistOptions.filter(hasPosition),
    [watchlistOptions, hasPosition],
  )

  const watchingOptionRows = useMemo(
    () =>
      watchlistOptions.filter(o => {
        if (matchesSizing(o)) return false
        if (matchesWatching(o)) return true
        if (isUncategorizedOption(o)) return true
        return false
      }),
    [watchlistOptions, matchesSizing, matchesWatching],
  )

  const stocksForPromoteToSizing = useMemo(
    () =>
      [...allStocks].sort((a, b) =>
        (a.symbol || a.contract_key).localeCompare(b.symbol || b.contract_key),
      ),
    [allStocks],
  )

  const watchingTabCount = watchingStockRows.length + watchingOptionRows.length
  const sizingTabCount = sizingStockRows.length
  const positionsTabCount = positionStockRows.length + positionOptRows.length

  return {
    watchingCategoryId,
    sizingCategoryId,
    positions,
    positionsNotInWatchlist,
    allStocks,
    watchlistOptions,
    hasPosition,
    watchingStockRows,
    otherCategoryStockRows,
    sizingStockRows,
    positionStockRows,
    positionOptRows,
    watchingOptionRows,
    stocksForPromoteToSizing,
    watchingTabCount,
    sizingTabCount,
    positionsTabCount,
    symbolFromItem,
    positionToContractKey,
  }
}

export type WatchlistWorkflow = ReturnType<typeof useWatchlistWorkflow>
