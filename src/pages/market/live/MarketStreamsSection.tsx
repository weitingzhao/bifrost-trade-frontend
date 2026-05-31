import { Activity, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { DailyBenchmark, QuoteItem } from '@/types/market'
import type { MarketStreamsRow, OptPositionRow } from '@/utils/marketStreamsRows'
import type { LiveSortGroup, MarketStreamsSortMode } from '@/utils/marketStreamsSort'
import type { OptionLiveBasis } from '@/utils/optionLiveBasis'
import { LiveStreamsSummaryBar } from './LiveStreamsSummaryBar'
import { FilterPillBar } from './FilterPillBar'
import { MarketStreamsTable } from './MarketStreamsTable'
import styles from './live.module.css'

interface Props {
  marketStreamsOk: boolean
  watchlistSymbolCount: number
  streamSyncFeedback: string | null
  onRefresh: () => void
  hasStreamAccounts: boolean
  streamAccountFilters: Set<'host' | 'secondary'>
  onToggleAccount: (key: 'host' | 'secondary') => void
  streamCategoryOrder: string[]
  positionCategoryFilters: Set<string>
  onToggleCategory: (cat: string) => void
  onCategoryDrop: (dragged: string, dropTarget: string) => void
  categoryOrderSaving: boolean
  msSortMode: MarketStreamsSortMode
  onCycleSort: () => void
  dragEnabled: boolean
  categoryOrderFiltered: string[]
  sortedRowsByCategory: Record<string, MarketStreamsRow[]>
  sortedOptRows: OptPositionRow[]
  unifiedGroupedRows: LiveSortGroup[] | null
  filteredRows: MarketStreamsRow[]
  optPositionRows: OptPositionRow[]
  marketStreamsDailyTotals: { totalDailyDollar: number; totalDailyPct: number | null }
  quotesByContractKey: Record<string, QuoteItem>
  benchmarks: Record<string, DailyBenchmark>
  optionLiveBasisByRow: Map<string, OptionLiveBasis>
  streamHostId: string | null
  streamSecondaryId: string | null
  onSymbolReorder: (category: string, fromSymbol: string, toSymbol: string) => void
  onOptRowReorder: (fromBasisKey: string, toBasisKey: string) => void
  streamsLamp: string
  summarySinceDollar: number
  summarySincePct: number | null
  summaryDailyDollar: number
  summaryDailyPct: number | null
  showSummaryBar: boolean
}

export function MarketStreamsSection({
  marketStreamsOk,
  watchlistSymbolCount,
  streamSyncFeedback,
  onRefresh,
  hasStreamAccounts,
  streamAccountFilters,
  onToggleAccount,
  streamCategoryOrder,
  positionCategoryFilters,
  onToggleCategory,
  onCategoryDrop,
  categoryOrderSaving,
  msSortMode,
  onCycleSort,
  dragEnabled,
  categoryOrderFiltered,
  sortedRowsByCategory,
  sortedOptRows,
  unifiedGroupedRows,
  filteredRows,
  optPositionRows,
  marketStreamsDailyTotals,
  quotesByContractKey,
  benchmarks,
  optionLiveBasisByRow,
  streamHostId,
  streamSecondaryId,
  onSymbolReorder,
  onOptRowReorder,
  streamsLamp,
  summarySinceDollar,
  summarySincePct,
  summaryDailyDollar,
  summaryDailyPct,
  showSummaryBar,
}: Props) {
  const navigate = useNavigate()

  const infoText = marketStreamsOk
    ? `Live quotes: IB ingestor writes Redis; Market API SSE + polling. STK symbols: Watchlist ∪ Host & Secondary positions; Watchlist category "Watching" STK are shown in Watching Stocks. ${watchlistSymbolCount} stream symbol(s). Refresh reloads quotes and daily benchmarks.`
    : 'Requires Market API Redis (quotes) and IB ingestor connected (see System status). Watching-category STK are in Watching Stocks on the Live split card.'

  return (
    <div className={styles.streamsBlock}>
      <LiveStreamsSummaryBar
        sinceDollar={summarySinceDollar}
        sincePct={summarySincePct}
        dailyDollar={summaryDailyDollar}
        dailyPct={summaryDailyPct}
        visible={showSummaryBar}
      />
      <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardTitleRow}>
          <StatusLamp lamp={streamsLamp} />
          <h2 className={cn(styles.cardTitle, 'inline-flex items-center gap-0')}>
            Market Streams
            <InfoTooltip text={infoText} />
          </h2>
        </div>
        <FilterPillBar
          hasStreamAccounts={hasStreamAccounts}
          streamAccountFilters={streamAccountFilters}
          onToggleAccount={onToggleAccount}
          streamCategoryOrder={streamCategoryOrder}
          positionCategoryFilters={positionCategoryFilters}
          onToggleCategory={onToggleCategory}
          onCategoryDrop={onCategoryDrop}
          categoryOrderSaving={categoryOrderSaving}
        />
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => navigate('/settings/subscribe')}
            title="Open Subscribe page"
            aria-label="Open Subscribe page"
          >
            <Activity className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onRefresh}
            title="Refresh quotes and daily benchmarks"
            aria-label="Refresh quotes and daily benchmarks"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {streamSyncFeedback != null && (
            <span className={styles.feedbackHint} aria-live="polite">
              {streamSyncFeedback}
            </span>
          )}
        </div>
      </div>

      <MarketStreamsTable
        hasStreamAccounts={hasStreamAccounts}
        msSortMode={msSortMode}
        onCycleSort={onCycleSort}
        dragEnabled={dragEnabled}
        categoryOrderFiltered={categoryOrderFiltered}
        sortedRowsByCategory={sortedRowsByCategory}
        sortedOptRows={sortedOptRows}
        unifiedGroupedRows={unifiedGroupedRows}
        filteredRows={filteredRows}
        optPositionRows={optPositionRows}
        marketStreamsDailyTotals={marketStreamsDailyTotals}
        quotesByContractKey={quotesByContractKey}
        benchmarks={benchmarks}
        optionLiveBasisByRow={optionLiveBasisByRow}
        streamHostId={streamHostId}
        streamSecondaryId={streamSecondaryId}
        onSymbolReorder={onSymbolReorder}
        onOptRowReorder={onOptRowReorder}
      />
      </div>
    </div>
  )
}
