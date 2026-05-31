import { useMemo, useState } from 'react'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { IbPositionRow } from '@/types/monitor'
import type { LivePositionRow, StockCoverageItem } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import {
  buildOptionDetailSegments,
  buildOptionStockMix,
  resolveDonutPrice,
  type OptionStockMixCategory,
} from '@/utils/positionsCharts'
import { DonutChart } from './DonutChart'
import { BubbleSwitch } from './BubbleSwitch'
import { ChartLegend } from './ChartLegend'
import { fmtMvAbbrev } from '@/utils/positionsCharts'

interface Props {
  accounts: IbAccountSnapshot[]
  chartAccountId: string
  liveStocks: LivePositionRow[]
  watchlistCoverageItems: StockCoverageItem[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  activeOptionDetail: string | null
  onOptionDetailClick: (label: string | null) => void
  activeOptionCategory: OptionStockMixCategory | null
  onOptionCategoryClick: (label: string | null) => void
}

export function OptionChartsCard({
  accounts,
  chartAccountId,
  liveStocks,
  watchlistCoverageItems,
  quotesBySymbol,
  quotesByCk,
  activeOptionDetail,
  onOptionDetailClick,
  activeOptionCategory,
  onOptionCategoryClick,
}: Props) {
  const [legendMode, setLegendMode] = useState<'pct' | 'usd'>('pct')
  const resolvePrice = (pos: IbPositionRow) => resolveDonutPrice(pos, quotesByCk, quotesBySymbol)

  const detailSegments = useMemo(
    () => buildOptionDetailSegments(accounts, chartAccountId as 'all' | string, resolvePrice),
    [accounts, chartAccountId, quotesByCk, quotesBySymbol],
  )

  const stockMix = useMemo(
    () => buildOptionStockMix(liveStocks, watchlistCoverageItems, chartAccountId as 'all' | string),
    [liveStocks, watchlistCoverageItems, chartAccountId],
  )

  const detailTotal = detailSegments.reduce((s, seg) => s + seg.value, 0)
  const mixTotal = stockMix.segments.reduce((s, seg) => s + seg.value, 0)

  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Option</span>
        <BubbleSwitch
          size="xs"
          options={[
            { value: 'pct', label: '%' },
            { value: 'usd', label: '$' },
          ]}
          value={legendMode}
          onChange={(v) => setLegendMode(v as 'pct' | 'usd')}
        />
        <span className="text-[10px] text-muted-foreground ml-auto truncate" title="Backing / Other / Cash-like">
          Backing / Other / Cash-like{' '}
          <span className="font-mono text-foreground font-semibold">
            {legendMode === 'pct'
              ? `${stockMix.backingPct.toFixed(1)}% / ${stockMix.otherPct.toFixed(1)}% / ${stockMix.cashLikePct.toFixed(1)}%`
              : `${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Backing Pool')?.value ?? 0)} / ${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Other Stock')?.value ?? 0)} / ${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Cash-like')?.value ?? 0)}`}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
        <DonutChart
          segments={detailSegments}
          centerMain={detailTotal > 0 ? (legendMode === 'usd' ? fmtMvAbbrev(detailTotal) : 'TOTAL') : undefined}
          centerSub={detailTotal > 0 && legendMode === 'pct' ? fmtMvAbbrev(detailTotal) : undefined}
          activeLabel={activeOptionDetail}
          onSegmentClick={onOptionDetailClick}
        />
        <ChartLegend
          segments={detailSegments}
          total={detailTotal}
          mode={legendMode}
          activeLabel={activeOptionDetail}
          onSegmentClick={(label) =>
            onOptionDetailClick(activeOptionDetail === label ? null : label)
          }
          showFootnotes
          layout="row"
        />
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <DonutChart
          segments={stockMix.segments}
          centerMain={mixTotal > 0 ? '100.0%' : undefined}
          centerSub={mixTotal > 0 ? 'TOTAL' : undefined}
          activeLabel={activeOptionCategory}
          onSegmentClick={(label) => {
            if (label == null) onOptionCategoryClick(null)
            else onOptionCategoryClick(activeOptionCategory === label ? null : (label as OptionStockMixCategory))
          }}
        />
        <ChartLegend
          segments={stockMix.segments}
          total={mixTotal}
          mode={legendMode}
          activeLabel={activeOptionCategory}
          onSegmentClick={(label) =>
            onOptionCategoryClick(
              activeOptionCategory === label ? null : (label as OptionStockMixCategory),
            )
          }
        />
      </div>
    </div>
  )
}
