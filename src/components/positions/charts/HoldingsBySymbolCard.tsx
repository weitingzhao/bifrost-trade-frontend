/**
 * One donut: the base, one segment per symbol, sized by market value.
 *
 * This is the Category Detail ring the restructure removed, brought back
 * without the parts that made it noisy: the seven-second carousel that scrolled
 * the stock legend on its own, and the Stocks / Fixed Income / Cash-like
 * toggles that lived on the chart. The page already scopes the rows; the ring
 * shows everything it is given and lets the legend do the ranking.
 *
 * The number a segment is sized by comes from one price chain — position
 * price, then the contract quote, then the symbol quote, then average cost.
 * A symbol whose chain resolves nothing is not a zero-value slice; it is left
 * out of the ring and named on a warning line, because a slice that is not
 * there looks like a holding that is not there.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { DenseTagButton } from '@/components/data-display'
import type { LivePositionRow } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { IbPositionRow } from '@/types/monitor'
import {
  UNDERLYING_CATEGORY_ORDER,
  buildSymbolDonutSegments,
  fmtMvAbbrev,
  resolveDonutPrice,
  type ChartDonutSegment,
  type UnderlyingCategoryFilter,
} from '@/utils/positionsCharts'
import { DonutChart } from './DonutChart'
import { ChartLegend } from './ChartLegend'

/** Rows the legend shows in full; the rest collapse to one line of tags. */
const LEGEND_TOP = 5

/** The card has no category toggles, so every bucket is always on. */
const ALL_CATEGORIES = Object.fromEntries(
  UNDERLYING_CATEGORY_ORDER.map((c) => [c, true]),
) as Record<UnderlyingCategoryFilter, boolean>

export interface HoldingsBySymbolCardProps {
  stocks: readonly LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  activeSymbol: string
  onSymbolClick: (symbol: string) => void
}

function isHolding(pos: IbPositionRow): boolean {
  if ((pos.secType ?? '').toUpperCase() === 'OPT') return false
  const qty = Number(pos.position)
  return Number.isFinite(qty) && qty !== 0
}

export function HoldingsBySymbolCard({
  stocks,
  quotesBySymbol,
  quotesByCk,
  activeSymbol,
  onSymbolClick,
}: HoldingsBySymbolCardProps) {
  const { segments, unpriced, hasHoldings } = useMemo(() => {
    const resolvePrice = (pos: IbPositionRow) => resolveDonutPrice(pos, quotesByCk, quotesBySymbol)
    const holdings = stocks.filter(isHolding)
    // The builder walks account snapshots; the page has already scoped the
    // rows, so a single synthetic account is the whole universe.
    const segs = buildSymbolDonutSegments([{ positions: holdings }], 'all', ALL_CATEGORIES, resolvePrice)
    // Any row the chain cannot price is named, even when a sibling row of the
    // same symbol was priced — the slice would still be understating it.
    const missing = new Set<string>()
    for (const pos of holdings) {
      if (resolvePrice(pos) == null) missing.add((pos.symbol ?? '?').toUpperCase())
    }
    return { segments: segs, unpriced: [...missing].sort(), hasHoldings: holdings.length > 0 }
  }, [stocks, quotesByCk, quotesBySymbol])

  if (!hasHoldings) {
    return <p className="text-xs text-muted-foreground">No holdings in scope.</p>
  }

  const total = segments.reduce((n, s) => n + s.value, 0)
  const top = segments.slice(0, LEGEND_TOP)
  const rest = segments.slice(LEGEND_TOP)
  const active = activeSymbol || null

  return (
    <div className="flex flex-wrap items-start gap-4">
      <DonutChart
        segments={segments}
        centerMain={total > 0 ? fmtMvAbbrev(total) : undefined}
        centerSub={total > 0 ? 'TOTAL' : undefined}
        activeLabel={active}
        onSegmentClick={(label) => label && onSymbolClick(label)}
        size={132}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <ChartLegend
          segments={top}
          total={total}
          mode="usd"
          layout="column"
          size="compact"
          activeLabel={active}
          onSegmentClick={onSymbolClick}
          dimmedUnlessActive
        />
        {rest.length > 0 && <MoreLine segments={rest} active={active} onSymbolClick={onSymbolClick} />}
        {unpriced.length > 0 && (
          <p className="text-dense-meta text-warning" role="status">
            unpriced: {unpriced.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}

function MoreLine({
  segments,
  active,
  onSymbolClick,
}: {
  segments: ChartDonutSegment[]
  active: string | null
  onSymbolClick: (symbol: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-1 text-dense-meta text-muted-foreground">
      <span className="shrink-0">+{segments.length} more</span>
      {segments.map((seg) => (
        <DenseTagButton
          key={seg.label}
          variant="symbol"
          size="cell"
          title={fmtMvAbbrev(seg.value)}
          aria-pressed={active === seg.label}
          onClick={() => onSymbolClick(seg.label)}
          className={cn('transition-opacity', active && active !== seg.label && 'opacity-40')}
        >
          {seg.label}
        </DenseTagButton>
      ))}
    </div>
  )
}
