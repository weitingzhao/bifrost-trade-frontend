import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
import type { PositionCategory } from '@/types/portfolio'
import { aggregateMarketStreamsDailyTotals } from '@/utils/marketStreamsDailyTotals'
import {
  applyOptRowReorder,
  buildDefaultCategoryOrder,
  buildMarketStreamsRowForSymbol,
  buildStreamCategoryOrder,
  buildWatchlistStkBySymbol,
  buildWatchlistSymbols,
  computeStreamsSummary,
  extractOptPositionRows,
  extractStreamPositionSymbols,
  extractWatchlistStkItems,
  filterByCategory,
  filterByStreamAccount,
  groupRowsByCategory,
  loadOptRowOrderFromStorage,
  optBasisKey,
  saveOptRowOrderToStorage,
  splitWatchingAndMarketStreams,
  type MarketStreamsRow,
} from '@/utils/marketStreamsRows'
import {
  cmpSymbolLocale,
  sortOptRowsByBasisOrder,
  sortRowsBySymbolOrder,
  type MarketStreamsSortMode,
} from '@/utils/marketStreamsSort'
import { useCategoryOrderPersistence } from '@/hooks/useMarketStreamsSymbolOrder'

export function useMarketStreamsSort(initial: MarketStreamsSortMode = 1) {
  const [msSortMode, setMsSortMode] = useState<MarketStreamsSortMode>(initial)
  const cycleSortMode = useCallback(() => {
    setMsSortMode(m => ((((m as number) % 9) + 1) as MarketStreamsSortMode))
  }, [])
  return { msSortMode, setMsSortMode, cycleSortMode, msDragEnabled: msSortMode === 1 }
}

export function useLiveMarketStreams(args: {
  status: StatusResponse | undefined
  quotesMap: Record<string, QuoteItem>
  benchmarks: Record<string, DailyBenchmark>
  watchlistItems: WatchlistItem[]
  positionCategories: PositionCategory[]
  symbolOrderByCategory: Record<string, string[]>
  msSortMode: MarketStreamsSortMode
}) {
  const {
    status,
    quotesMap,
    benchmarks,
    watchlistItems,
    positionCategories,
    symbolOrderByCategory,
    msSortMode,
  } = args

  const accounts = useMemo(() => status?.portfolio?.accounts ?? [], [status?.portfolio?.accounts])
  const ibAcct = status?.config?.ib_client?.account
  const streamHostId = (ibAcct?.event_host ?? '').trim() || null
  const streamSecondaryId = (ibAcct?.event_secondary ?? '').trim() || null
  const hasStreamAccounts = streamHostId != null || streamSecondaryId != null

  const [streamAccountFilters, setStreamAccountFilters] = useState<Set<'host' | 'secondary'>>(() => new Set())
  const [positionCategoryFilters, setPositionCategoryFilters] = useState<Set<string>>(() => new Set())
  const [optRowOrder, setOptRowOrder] = useState<string[]>(loadOptRowOrderFromStorage)

  const { categoryOrder, setCategoryOrder, categoryOrderSaving, persistCategoryOrder } =
    useCategoryOrderPersistence(positionCategories)

  const watchlistStkItems = useMemo(() => extractWatchlistStkItems(watchlistItems), [watchlistItems])
  const watchlistStkBySymbol = useMemo(() => buildWatchlistStkBySymbol(watchlistStkItems), [watchlistStkItems])
  const watchlistSymbolSet = useMemo(() => {
    const set = new Set<string>()
    for (const w of watchlistStkItems) {
      const sym = (w.symbol ?? '').trim().toUpperCase()
      if (sym) set.add(sym)
    }
    return set
  }, [watchlistStkItems])

  const subscribedSet = useMemo(
    () =>
      new Set(
        (status?.live_ui?.subscribed_tickers ?? [])
          .map(s => (s && typeof s === 'string' ? s.trim().toUpperCase() : ''))
          .filter(Boolean),
      ),
    [status?.live_ui?.subscribed_tickers],
  )
  const wishlistSet = watchlistSymbolSet.size > 0 ? watchlistSymbolSet : subscribedSet

  const streamPositionSymbols = useMemo(
    () => extractStreamPositionSymbols(accounts, streamHostId, streamSecondaryId),
    [accounts, streamHostId, streamSecondaryId],
  )

  const watchlistSymbols = useMemo(
    () =>
      buildWatchlistSymbols({
        subscribedTickers: status?.live_ui?.subscribed_tickers ?? [],
        streamHostSymbols: streamPositionSymbols.host,
        streamSecondarySymbols: streamPositionSymbols.secondary,
        quoteSymbolKeys: Object.keys(quotesMap),
      }),
    [status?.live_ui?.subscribed_tickers, streamPositionSymbols, quotesMap],
  )

  const watchlistRows = useMemo(
    () =>
      watchlistSymbols.map(symbol =>
        buildMarketStreamsRowForSymbol({
          symbol,
          accounts,
          quotesMap,
          benchmarks,
          streamHostId,
          streamSecondaryId,
          hasStreamAccounts,
          wishlistSet,
        }),
      ),
    [
      watchlistSymbols,
      accounts,
      quotesMap,
      benchmarks,
      streamHostId,
      streamSecondaryId,
      hasStreamAccounts,
      wishlistSet,
    ],
  )

  const { marketStreamsRows, watchingTickerRows } = useMemo(
    () => splitWatchingAndMarketStreams(watchlistRows, watchlistStkBySymbol),
    [watchlistRows, watchlistStkBySymbol],
  )

  const watchingTickerRowsSorted = useMemo(
    () => [...watchingTickerRows].sort((a, b) => cmpSymbolLocale(a.symbol, b.symbol, 1)),
    [watchingTickerRows],
  )

  const optPositionRows = useMemo(() => extractOptPositionRows(accounts), [accounts])

  const toggleStreamAccountFilter = useCallback((key: 'host' | 'secondary') => {
    setStreamAccountFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const togglePositionCategoryFilter = useCallback((cat: string) => {
    setPositionCategoryFilters(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const filteredByAccount = useMemo(
    () => filterByStreamAccount(marketStreamsRows, streamAccountFilters, hasStreamAccounts),
    [marketStreamsRows, streamAccountFilters, hasStreamAccounts],
  )

  const filteredRows = useMemo(
    () => filterByCategory(filteredByAccount, positionCategoryFilters),
    [filteredByAccount, positionCategoryFilters],
  )

  const marketStreamsDailyTotals = useMemo(
    () => aggregateMarketStreamsDailyTotals(filteredRows, benchmarks),
    [filteredRows, benchmarks],
  )

  const streamsSummary = useMemo(
    () => computeStreamsSummary(filteredRows, marketStreamsDailyTotals),
    [filteredRows, marketStreamsDailyTotals],
  )

  const categoryNamesFromData = useMemo(() => {
    const set = new Set<string>()
    marketStreamsRows.forEach(row => set.add(row.category))
    return Array.from(set)
  }, [marketStreamsRows])

  const defaultCategoryOrder = useMemo(
    () => buildDefaultCategoryOrder(positionCategories, categoryNamesFromData),
    [positionCategories, categoryNamesFromData],
  )

  const streamCategoryOrder = useMemo(
    () => buildStreamCategoryOrder(categoryOrder, defaultCategoryOrder, categoryNamesFromData),
    [categoryOrder, defaultCategoryOrder, categoryNamesFromData],
  )

  useEffect(() => {
    if (defaultCategoryOrder.length > 0 && categoryOrder.length === 0) {
      setCategoryOrder(defaultCategoryOrder)
    }
  }, [defaultCategoryOrder, categoryOrder.length, setCategoryOrder])

  const categoryOrderFiltered = useMemo(() => {
    if (positionCategoryFilters.size === 0) return streamCategoryOrder
    return streamCategoryOrder.filter(c => positionCategoryFilters.has(c))
  }, [streamCategoryOrder, positionCategoryFilters])

  const rowsByCategory = useMemo(() => groupRowsByCategory(filteredRows), [filteredRows])

  const sortedRowsByCategory = useMemo(() => {
    const out: Record<string, MarketStreamsRow[]> = {}
    for (const [cat, rows] of Object.entries(rowsByCategory)) {
      out[cat] = sortRowsBySymbolOrder(rows, symbolOrderByCategory[cat])
    }
    return out
  }, [rowsByCategory, symbolOrderByCategory])

  const sortedOptRows = useMemo(() => {
    if (msSortMode !== 1) return optPositionRows
    return sortOptRowsByBasisOrder(optPositionRows, optRowOrder)
  }, [optPositionRows, optRowOrder, msSortMode])

  const applyOptRowReorderFn = useCallback(
    (fromBasisKey: string, toBasisKey: string) => {
      const allBasisKeys = optPositionRows.map(r => optBasisKey(r))
      setOptRowOrder(prev => {
        const next = applyOptRowReorder(allBasisKeys, prev, fromBasisKey, toBasisKey)
        saveOptRowOrderToStorage(next)
        return next
      })
    },
    [optPositionRows],
  )

  const handleCategoryDrop = useCallback(
    (dragged: string, dropTarget: string) => {
      if (!dragged || dragged === dropTarget) return
      const current = categoryOrder.length > 0 ? categoryOrder : defaultCategoryOrder
      const fromIdx = current.indexOf(dragged)
      const toIdx = current.indexOf(dropTarget)
      if (fromIdx === -1 || toIdx === -1) return
      const next = [...current]
      next.splice(fromIdx, 1)
      next.splice(next.indexOf(dropTarget), 0, dragged)
      persistCategoryOrder(next)
    },
    [categoryOrder, defaultCategoryOrder, persistCategoryOrder],
  )

  return {
    streamHostId,
    streamSecondaryId,
    hasStreamAccounts,
    streamAccountFilters,
    toggleStreamAccountFilter,
    positionCategoryFilters,
    togglePositionCategoryFilter,
    marketStreamsRows,
    filteredRows,
    streamsSummary,
    streamCategoryOrder,
    categoryOrderFiltered,
    sortedRowsByCategory,
    rowsByCategory,
    watchingTickerRowsSorted,
    watchlistOptionItems: watchlistItems.filter(w => (w.sec_type ?? '').toUpperCase() === 'OPT'),
    optPositionRows,
    sortedOptRows,
    applyOptRowReorder: applyOptRowReorderFn,
    categoryOrderSaving,
    handleCategoryDrop,
    watchlistSymbols,
  }
}
