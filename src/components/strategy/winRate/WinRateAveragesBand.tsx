import type { WinRateStructureRow } from '@/types/strategy'
import { fmtUsd } from '@/utils/positions'
import { fmtWinRatePct } from '@/utils/winRate'
import { cn } from '@/lib/utils'
import {
  winRateAveragesTotalsClass,
  winRateMetricClass,
  winRateMetricLabelClass,
  winRateMetricValueClass,
  winRateMetricsWrapClass,
  winRateMetricsWrapItemClass,
  winRateSectionClass,
  winRateSectionLabelClass,
  winRateTotalsSectionClass,
  winRateTotalsSectionLabelClass,
} from './winRateUi'
import { WinRateKpi } from './WinRateKpi'
import { profitLossToneClass } from './toneClasses'
import type { ProfitLossTone } from '@/utils/winRate'

function AverageMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: ProfitLossTone
}) {
  return (
    <div className={cn(winRateMetricClass, winRateMetricsWrapItemClass)}>
      <span className={winRateMetricLabelClass}>{label}</span>
      <span className={cn(winRateMetricValueClass, profitLossToneClass(tone))}>{value}</span>
    </div>
  )
}

export function WinRateAveragesBand({
  row,
  layout = 'wrap',
}: {
  row: WinRateStructureRow
  layout?: 'wrap' | 'totals'
}) {
  if (layout === 'totals') {
    return (
      <div className={winRateTotalsSectionClass}>
        <div className={winRateTotalsSectionLabelClass}>Averages</div>
        <div className={winRateAveragesTotalsClass}>
          <WinRateKpi
            label="Profit avg %"
            value={fmtWinRatePct(row.profit_avg_pct)}
            tone="positive"
            compact
          />
          <WinRateKpi
            label="Loss avg %"
            value={fmtWinRatePct(row.loss_avg_pct)}
            tone="negative"
            compact
          />
          <WinRateKpi
            label="Max loss %"
            value={fmtWinRatePct(row.single_max_loss_pct)}
            tone="negative"
            compact
          />
          <WinRateKpi
            label="Profit avg $"
            value={row.profit_avg_usd != null ? fmtUsd(row.profit_avg_usd) : '—'}
            tone="positive"
            compact
          />
          <WinRateKpi
            label="Loss avg $"
            value={row.loss_avg_usd != null ? fmtUsd(row.loss_avg_usd) : '—'}
            tone="negative"
            compact
          />
        </div>
      </div>
    )
  }

  return (
    <div className={winRateSectionClass}>
      <div className={winRateSectionLabelClass}>Averages</div>
      <div className={winRateMetricsWrapClass}>
        <AverageMetric label="Profit avg %" value={fmtWinRatePct(row.profit_avg_pct)} tone="positive" />
        <AverageMetric label="Loss avg %" value={fmtWinRatePct(row.loss_avg_pct)} tone="negative" />
        <AverageMetric
          label="Max loss %"
          value={fmtWinRatePct(row.single_max_loss_pct)}
          tone="negative"
        />
        <AverageMetric
          label="Profit avg $"
          value={row.profit_avg_usd != null ? fmtUsd(row.profit_avg_usd) : '—'}
          tone="positive"
        />
        <AverageMetric
          label="Loss avg $"
          value={row.loss_avg_usd != null ? fmtUsd(row.loss_avg_usd) : '—'}
          tone="negative"
        />
      </div>
    </div>
  )
}
