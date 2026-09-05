/**
 * One donut: the base, split by what it is doing for the option book.
 *
 * Three allocation donuts used to open the page — asset mix, underlying
 * category, option backing. They answered how capital is distributed, which is
 * a monthly question. This asks the page's own question: of everything held
 * underneath the options, how much is backing a call, how much is backing a
 * put, how much is free, and how much cannot back anything at all. Same numbers
 * as the gauges above it; the ring is the picture of them.
 */
import { DonutChart } from './DonutChart'
import { ChartLegend } from './ChartLegend'
import { baseRoleSegments, fmtMvAbbrev } from '@/utils/positionsCharts'
import type { BookVsBase } from '@/utils/bookVsBase'

export function BaseRoleCard({ book }: { book: BookVsBase }) {
  const segments = baseRoleSegments(book)
  const total = segments.reduce((n, s) => n + s.value, 0)
  const inUse = segments
    .filter((s) => s.label === 'Backing calls' || s.label === 'Backing puts')
    .reduce((n, s) => n + s.value, 0)

  if (total <= 0) {
    return <p className="text-xs text-muted-foreground">No base holdings to show.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DonutChart
        segments={segments}
        centerMain={`${Math.round((inUse / total) * 100)}%`}
        centerSub={`of ${fmtMvAbbrev(total)} in use`}
        size={132}
      />
      <div className="min-w-0 flex-1">
        <ChartLegend segments={segments} total={total} mode="usd" layout="column" size="compact" />
      </div>
    </div>
  )
}
