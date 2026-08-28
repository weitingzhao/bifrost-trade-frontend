import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useOpenOrders } from '@/hooks/useOpenOrders'
import { useQuoteStream } from '@/hooks/useQuoteStream'
import { usePositionCategories } from '@/hooks/usePositionCategories'
import { useLiveMarketStreams, useMarketStreamsSort } from '@/hooks/useLiveMarketStreams'
import { useMarketStreamsSymbolOrder } from '@/hooks/useMarketStreamsSymbolOrder'
import { useOptionLiveBasis } from '@/hooks/useOptionLiveBasis'
import { fetchQuotes, fetchBenchmarks, postQuotesCleanup, postQuotesRefreshOptions } from '@/api/market'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { aggregateMarketStreamsDailyTotals } from '@/utils/marketStreamsDailyTotals'
import { buildUnifiedGroupedRows } from '@/utils/marketStreamsSort'
import { mergeQuotesIntoSymbolMap, trimStaleStkQuotes } from '@/utils/marketStreamsRows'
import { computeOptMidAndLivePnl } from '@/utils/optionLiveBasis'
import { quotesByContractKeyFromMap, type OptPositionRow } from '@/utils/marketStreamsRows'
import {
  computeMarketStreamsOk,
  computeMarketStreamsLamp,
  computeOpenOrdersLamp,
} from '@/utils/livePageLamps'
import { partitionOpenOrders } from './openOrdersPartition'
import { MarketStreamsSection } from './MarketStreamsSection'
import { LiveBottomSplit } from './LiveBottomSplit'
import { livePageStackClass } from './liveUi'

export default function LivePage() {
  const queryClient = useQueryClient()
  const { data: status } = useMonitorStatus()
  const { data: watchlistData } = useWatchlist()
  const { data: positionCategoriesData } = usePositionCategories()
  const {
    data: openOrdersData,
    isSuccess: openOrdersFetched,
    dataUpdatedAt: openOrdersUpdatedMs,
  } = useOpenOrders()
  const [streamSyncFeedback, setStreamSyncFeedback] = useState<string | null>(null)

  const positionCategories = positionCategoriesData?.items ?? []
  const strategyActive = status?.strategy?.active

  const accounts = useMemo(() => status?.portfolio?.accounts ?? [], [status?.portfolio?.accounts])
  const watchlistItems = useMemo(() => watchlistData?.items ?? [], [watchlistData?.items])
  const subscribed = useMemo(
    () => status?.live_ui?.subscribed_tickers ?? [],
    [status?.live_ui?.subscribed_tickers],
  )

  const { symbolOrderByCategory, applySymbolReorder } = useMarketStreamsSymbolOrder()
  const { msSortMode, cycleSortMode, msDragEnabled } = useMarketStreamsSort(1)

  const stkSymbolsFromAccounts = useMemo(() => {
    const set = new Set<string>()
    for (const acc of accounts) {
      for (const p of acc?.positions ?? []) {
        if ((p.secType ?? '').toUpperCase() === 'STK' && p.symbol) set.add(p.symbol)
      }
    }
    return Array.from(set)
  }, [accounts])

  const watchlistStkSymbols = useMemo(
    () =>
      watchlistItems
        .filter(w => (w.sec_type ?? 'STK').toUpperCase() !== 'OPT')
        .map(w => w.symbol)
        .filter(Boolean),
    [watchlistItems],
  )

  const allSymbols = useMemo(
    () => [...new Set([...subscribed, ...stkSymbolsFromAccounts, ...watchlistStkSymbols])],
    [subscribed, stkSymbolsFromAccounts, watchlistStkSymbols],
  )

  const allContractKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const w of watchlistItems) {
      const ck = (w.contract_key ?? '').trim()
      if (ck && (w.sec_type ?? '').toUpperCase() === 'OPT') keys.add(ck)
    }
    for (const acc of accounts) {
      for (const p of acc?.positions ?? []) {
        const ck = (p.contract_key ?? '').trim()
        if (ck && (p.secType ?? '').toUpperCase() === 'OPT') keys.add(ck)
      }
    }
    return Array.from(keys)
  }, [watchlistItems, accounts])

  const { quotesMap, isError: quotesError } = useQuoteStream(allSymbols, allContractKeys)

  const benchmarkSymbols = useMemo(
    () =>
      [
        ...new Set([
          ...allSymbols.filter(s => s.length <= 5),
          ...(status?.live_ui?.reference_indices?.map(r => r.symbol) ?? []),
        ]),
      ],
    [allSymbols, status?.live_ui?.reference_indices],
  )

  const { data: benchmarkData } = useBenchmarks(benchmarkSymbols)
  const benchmarks = useMemo(() => benchmarkData?.benchmarks ?? {}, [benchmarkData])

  const quotesByContractKey = useMemo(() => quotesByContractKeyFromMap(quotesMap), [quotesMap])

  const streams = useLiveMarketStreams({
    status,
    quotesMap,
    benchmarks,
    watchlistItems,
    positionCategories,
    symbolOrderByCategory,
    msSortMode,
  })

  const { optionLiveBasisByRow } = useOptionLiveBasis(streams.optPositionRows)

  const marketStreamsOk = useMemo(
    () => computeMarketStreamsOk(status, quotesMap),
    [status, quotesMap],
  )

  const streamsLamp = computeMarketStreamsLamp(status, quotesMap)
  const ordersLamp = computeOpenOrdersLamp(status)

  const marketStreamsDailyTotals = useMemo(
    () => aggregateMarketStreamsDailyTotals(streams.filteredRows, benchmarks),
    [streams.filteredRows, benchmarks],
  )

  const unifiedGroupedRows = useMemo(() => {
    const sumOptPnl = (rows: OptPositionRow[]) =>
      rows.reduce((acc, row) => {
        const basis = optionLiveBasisByRow.get(
          `${row.account_id.toLowerCase()}\t${row.contract_key}`,
        )
        const { livePnl } = computeOptMidAndLivePnl(
          row,
          quotesByContractKey[row.contract_key],
          basis,
        )
        return acc + (livePnl != null && Number.isFinite(livePnl) ? livePnl : 0)
      }, 0)

    return buildUnifiedGroupedRows({
      mode: msSortMode,
      filteredRows: streams.filteredRows,
      optPositionRows: streams.optPositionRows,
      sumOptPnl,
    })
  }, [
    msSortMode,
    streams.filteredRows,
    streams.optPositionRows,
    optionLiveBasisByRow,
    quotesByContractKey,
  ])

  const knownSourceSymbols = useMemo(() => {
    const set = new Set<string>()
    for (const s of stkSymbolsFromAccounts) {
      const u = s.trim().toUpperCase()
      if (u) set.add(u)
    }
    for (const s of watchlistStkSymbols) {
      const u = s.trim().toUpperCase()
      if (u) set.add(u)
    }
    return Array.from(set)
  }, [stkSymbolsFromAccounts, watchlistStkSymbols])

  const handleRefresh = useCallback(async () => {
    setStreamSyncFeedback('Refreshing…')
    try {
      const keepSet = new Set(knownSourceSymbols)
      queryClient.setQueryData<Record<string, import('@/types/market').QuoteItem>>(
        QUERY_KEYS.market.quotesLive,
        prev => trimStaleStkQuotes(prev ?? {}, keepSet),
      )
      try {
        await postQuotesCleanup(knownSourceSymbols)
      } catch {
        // Backend cleanup may not be deployed yet; local purge + refetch still apply.
      }
      try {
        await postQuotesRefreshOptions(allContractKeys)
      } catch {
        // Soft-fail: older Market API without /quotes/refresh-options; GET /quotes still registers.
      }
      await Promise.all([
        fetchQuotes(allSymbols, allContractKeys).then(resp => {
          queryClient.setQueryData<Record<string, import('@/types/market').QuoteItem>>(
            QUERY_KEYS.market.quotesLive,
            prev => mergeQuotesIntoSymbolMap(prev ?? {}, resp.quotes),
          )
        }),
        fetchBenchmarks(benchmarkSymbols).then(resp => {
          queryClient.setQueryData(['market', 'benchmarks', benchmarkSymbols], resp)
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status }),
      ])
      setStreamSyncFeedback('Updated')
    } catch {
      setStreamSyncFeedback('Failed')
    }
    window.setTimeout(() => setStreamSyncFeedback(null), 4000)
  }, [allSymbols, allContractKeys, benchmarkSymbols, knownSourceSymbols, queryClient])

  const mergedOpenOrders = useMemo(() => {
    if (openOrdersFetched) return openOrdersData ?? []
    return status?.portfolio?.open_orders ?? []
  }, [openOrdersFetched, openOrdersData, status?.portfolio?.open_orders])

  const { optOrders, stkOrders } = useMemo(
    () => partitionOpenOrders(mergedOpenOrders),
    [mergedOpenOrders],
  )

  const openOrdersUpdatedAt =
    openOrdersFetched && openOrdersUpdatedMs ? openOrdersUpdatedMs / 1000 : null

  const handleSymbolReorder = useCallback(
    (category: string, fromSymbol: string, toSymbol: string) => {
      const rows =
        streams.sortedRowsByCategory[category] ?? streams.rowsByCategory[category] ?? []
      applySymbolReorder(
        category,
        fromSymbol,
        toSymbol,
        rows.map(r => r.symbol),
      )
    },
    [applySymbolReorder, streams.sortedRowsByCategory, streams.rowsByCategory],
  )

  return (
    <PageShell padding="compact">
      <div className={livePageStackClass}>
        {quotesError && (
          <QueryErrorAlert error="Failed to load live quotes — check Market API connection." />
        )}

        {/* Program research-copilot-reach P1 — Live had no Copilot entry point
            even though the backend exposes trade.market_watchlist / market_quotes.
            No PageHeader on this compact page, so the button gets its own row. */}
        <div className="flex items-center justify-end">
          <AskCopilotButton
            originPage="market-live"
            originLabel="Market Live"
            snapshot={compactSnapshot({
              watchlist_symbols: streams.watchlistSymbols,
              watchlist_symbol_count: streams.watchlistSymbols.length,
              market_streams_ok: marketStreamsOk,
              active_structure: strategyActive?.structure?.name ?? undefined,
              active_gate: strategyActive?.gate_safety?.name ?? undefined,
            })}
            suggestedPrompt="这些标的今天有什么值得注意的？结合我的持仓说说异常波动和风险。"
          />
        </div>


        {strategyActive && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {strategyActive.structure?.name && (
              <Badge variant="secondary" className="font-normal">
                S: {strategyActive.structure.name}
              </Badge>
            )}
            {strategyActive.gate_safety?.name && (
              <Badge variant="secondary" className="font-normal">
                G: {strategyActive.gate_safety.name}
              </Badge>
            )}
            {strategyActive.allocation?.name && (
              <Badge variant="secondary" className="font-normal">
                A: {strategyActive.allocation.name}
              </Badge>
            )}
          </div>
        )}

        <MarketStreamsSection
          marketStreamsOk={marketStreamsOk}
          watchlistSymbolCount={streams.watchlistSymbols.length}
          streamSyncFeedback={streamSyncFeedback}
          onRefresh={() => void handleRefresh()}
          hasStreamAccounts={streams.hasStreamAccounts}
          accountViewMode={streams.accountViewMode}
          onAccountViewModeChange={streams.setAccountViewMode}
          optPremiumUnit={streams.optPremiumUnit}
          onOptPremiumUnitChange={streams.setOptPremiumUnit}
          streamCategoryOrder={streams.streamCategoryOrder}
          positionCategoryFilters={streams.positionCategoryFilters}
          onToggleCategory={streams.togglePositionCategoryFilter}
          onCategoryDrop={streams.handleCategoryDrop}
          categoryOrderSaving={streams.categoryOrderSaving}
          msSortMode={msSortMode}
          onCycleSort={cycleSortMode}
          dragEnabled={msDragEnabled}
          categoryOrderFiltered={streams.categoryOrderFiltered}
          sortedRowsByCategory={streams.sortedRowsByCategory}
          sortedOptRows={streams.sortedOptRows}
          unifiedGroupedRows={unifiedGroupedRows}
          filteredRows={streams.filteredRows}
          optPositionRows={streams.optPositionRows}
          marketStreamsDailyTotals={marketStreamsDailyTotals}
          quotesByContractKey={quotesByContractKey}
          benchmarks={benchmarks}
          optionLiveBasisByRow={optionLiveBasisByRow}
          streamHostId={streams.streamHostId}
          streamSecondaryId={streams.streamSecondaryId}
          onSymbolReorder={handleSymbolReorder}
          onOptRowReorder={streams.applyOptRowReorder}
          streamsLamp={streamsLamp}
          summarySinceDollar={streams.streamsSummary.totalCostPnl}
          summarySincePct={streams.streamsSummary.sincePct}
          summaryDailyDollar={streams.streamsSummary.totalDailyDollar}
          summaryDailyPct={streams.streamsSummary.totalDailyPct}
          showSummaryBar={streams.filteredRows.length > 0 || streams.marketStreamsRows.length > 0}
        />

        <LiveBottomSplit
          watchingRows={streams.watchingTickerRowsSorted}
          subscribedRows={streams.subscribedTickerRowsSorted}
          watchingOptions={streams.watchlistOptionItems}
          optOrders={optOrders}
          stkOrders={stkOrders}
          benchmarks={benchmarks}
          quotesMap={quotesMap}
          quotesByContractKey={quotesByContractKey}
          streamsLamp={streamsLamp}
          ordersLamp={ordersLamp}
          hasStreamAccounts={streams.hasStreamAccounts}
          openOrdersUpdatedAt={openOrdersUpdatedAt}
          status={status}
        />
      </div>
    </PageShell>
  )
}
