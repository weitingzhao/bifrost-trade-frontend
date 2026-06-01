import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
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
import { BubbleSwitch, POSITIONS_BUBBLE_SIZE } from './BubbleSwitch'
import { ChartLegend } from './ChartLegend'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { PositionsChartCell, DonutChartRow } from './PositionsChartCell'
import styles from '../PositionsChartsSection.module.css'

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

  const mixSummary =
    legendMode === 'pct'
      ? `${stockMix.backingPct.toFixed(1)}% / ${stockMix.otherPct.toFixed(1)}% / ${stockMix.cashLikePct.toFixed(1)}%`
      : `${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Backing Pool')?.value ?? 0)} / ${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Other Stock')?.value ?? 0)} / ${fmtMvAbbrev(stockMix.segments.find((s) => s.label === 'Cash-like')?.value ?? 0)}`

  return (
    <PositionsChartCell>
      <div className={cn(styles.chartSectionHeader, styles.optionHeader)}>
        <span className={styles.chartSectionTitle}>Option</span>
        <BubbleSwitch
          size={POSITIONS_BUBBLE_SIZE}
          options={[
            { value: 'pct', label: '%' },
            { value: 'usd', label: '$' },
          ]}
          value={legendMode}
          onChange={(v) => setLegendMode(v as 'pct' | 'usd')}
        />
        <div className={styles.optionHeaderSummary} title="Backing Pool / Other Stock / Cash-like">
          <span className={styles.optionHeaderSummaryLabel}>Backing / Other / Cash-like</span>
          <span className={styles.optionHeaderSummaryValues}>{mixSummary}</span>
        </div>
      </div>

      <div className={styles.stack}>
        <DonutChartRow title="Detail" alignStart>
          <DonutChart
            segments={detailSegments}
            centerMain={detailTotal > 0 ? (legendMode === 'usd' ? fmtMvAbbrev(detailTotal) : '100.0%') : undefined}
            centerSub={detailTotal > 0 && legendMode === 'pct' ? 'TOTAL' : legendMode === 'usd' && detailTotal > 0 ? 'TOTAL' : undefined}
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
        </DonutChartRow>

        <DonutChartRow title="Category">
          <DonutChart
            segments={stockMix.segments}
            centerMain={mixTotal > 0 ? '100.0%' : undefined}
            centerSub={mixTotal > 0 ? 'TOTAL' : undefined}
            activeLabel={activeOptionCategory}
            onSegmentClick={(label) => {
              if (label == null) onOptionCategoryClick(null)
              else
                onOptionCategoryClick(
                  activeOptionCategory === label ? null : (label as OptionStockMixCategory),
                )
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
        </DonutChartRow>
      </div>
    </PositionsChartCell>
  )
}
