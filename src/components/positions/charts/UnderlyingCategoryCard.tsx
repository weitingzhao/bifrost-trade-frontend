import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import {
  UNDERLYING_CATEGORY_ORDER,
  buildCategoryDetailLegendGroups,
  buildSymbolDonutSegments,
  buildUnderlyingCategorySegments,
  resolveDonutPrice,
  type UnderlyingCategoryFilter,
} from '@/utils/positionsCharts'
import { DonutChart } from './DonutChart'
import { ChartLegend } from './ChartLegend'
import { fmtMvAbbrev } from '@/utils/positionsCharts'

interface Props {
  accounts: IbAccountSnapshot[]
  chartAccountId: string
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  categoryFilter: Record<UnderlyingCategoryFilter, boolean>
  onCategoryFilterChange: (cat: UnderlyingCategoryFilter) => void
  activeSymbol: string
  onSymbolClick: (symbol: string) => void
  activeCategoryWeight: string | null
  onCategoryWeightClick: (label: string | null) => void
}

export function UnderlyingCategoryCard({
  accounts,
  chartAccountId,
  quotesBySymbol,
  quotesByCk,
  categoryFilter,
  onCategoryFilterChange,
  activeSymbol,
  onSymbolClick,
  activeCategoryWeight,
  onCategoryWeightClick,
}: Props) {
  const resolvePrice = (pos: IbPositionRow) => resolveDonutPrice(pos, quotesByCk, quotesBySymbol)

  const symbolSegments = useMemo(
    () =>
      buildSymbolDonutSegments(
        accounts,
        chartAccountId as 'all' | string,
        categoryFilter,
        resolvePrice,
      ),
    [accounts, chartAccountId, categoryFilter, quotesByCk, quotesBySymbol],
  )

  const detailGroups = useMemo(
    () =>
      buildCategoryDetailLegendGroups(
        symbolSegments,
        accounts,
        chartAccountId as 'all' | string,
        categoryFilter,
        resolvePrice,
      ),
    [symbolSegments, accounts, chartAccountId, categoryFilter, quotesByCk, quotesBySymbol],
  )

  const weightSegments = useMemo(
    () => buildUnderlyingCategorySegments(accounts, chartAccountId as 'all' | string, resolvePrice),
    [accounts, chartAccountId, quotesByCk, quotesBySymbol],
  )

  const anyEnabled = UNDERLYING_CATEGORY_ORDER.some((c) => categoryFilter[c])
  const symbolTotal = symbolSegments.reduce((s, seg) => s + seg.value, 0)
  const weightTotal = weightSegments.reduce((s, seg) => s + seg.value, 0)

  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground">Underlying category</span>
        <div className="flex rounded-md border overflow-hidden text-[10px]">
          {UNDERLYING_CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryFilterChange(cat)}
              className={cn(
                'px-2 py-0.5 transition-colors font-medium',
                categoryFilter[cat] ? 'bg-primary text-primary-foreground' : 'hover:bg-muted opacity-60',
              )}
              aria-pressed={categoryFilter[cat]}
            >
              {cat === 'Fixed Income' ? 'Fixed Income' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <DonutChart
          segments={symbolSegments}
          centerMain={symbolTotal > 0 ? fmtMvAbbrev(symbolTotal) : undefined}
          activeLabel={activeSymbol || null}
          onSegmentClick={(label) => label && onSymbolClick(label)}
        />
        <div className="min-w-0 space-y-2 max-h-[140px] overflow-y-auto">
          {detailGroups.map((group) => (
            <div key={group.category}>
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{group.category}</p>
              <ChartLegend
                segments={group.segments}
                total={symbolTotal}
                mode="pct"
                activeLabel={activeSymbol || null}
                onSegmentClick={onSymbolClick}
                dimmedUnlessActive
                layout={group.category === 'Stocks' ? 'grid2' : 'row'}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <DonutChart
          segments={weightSegments}
          centerMain={weightTotal > 0 ? '100%' : undefined}
          activeLabel={activeCategoryWeight}
          onSegmentClick={onCategoryWeightClick}
        />
        <ChartLegend
          segments={weightSegments}
          total={weightTotal}
          mode="pct"
          activeLabel={activeCategoryWeight}
          onSegmentClick={(label) =>
            onCategoryWeightClick(activeCategoryWeight === label ? null : label)
          }
        />
      </div>

      {!anyEnabled && (
        <p className="text-xs text-muted-foreground">Turn on at least one category to show symbol proportions.</p>
      )}
    </div>
  )
}
