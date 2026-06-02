import type { WinRateStructureRow } from '@/types/strategy'
import { fmtUsd } from '@/utils/positions'
import {
  fmtStructureReturnPct,
  structureReturnTone,
  winRateTotalLossDisplayUsd,
  winRateTotalLossTone,
  winRateTotalProfitDisplayUsd,
  winRateTotalProfitTone,
} from '@/utils/winRate'
import { cn } from '@/lib/utils'
import {
  winRateMetricClass,
  winRateMetricLabelClass,
  winRateMetricValueClass,
  winRateMetricValuePnlClass,
  winRateMetrics3Class,
  winRateSectionClass,
  winRateSectionLabelClass,
  winRateTotalsBandMetricPnlClass,
  winRateTotalsSectionClass,
  winRateTotalsSectionLabelClass,
} from './winRateUi'
import { profitLossToneClass } from './toneClasses'
import type { ProfitLossTone } from '@/utils/winRate'

function PnlMetric({
  label,
  value,
  tone,
  title,
  inTotals = false,
}: {
  label: string
  value: string
  tone: ProfitLossTone
  title?: string
  inTotals?: boolean
}) {
  return (
    <div className={winRateMetricClass} title={title}>
      <span className={winRateMetricLabelClass}>{label}</span>
      <span
        className={cn(
          winRateMetricValueClass,
          winRateMetricValuePnlClass,
          inTotals && winRateTotalsBandMetricPnlClass,
          profitLossToneClass(tone),
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function WinRatePnlBand({
  row,
  inTotals = false,
}: {
  row: WinRateStructureRow
  inTotals?: boolean
}) {
  const totalLossUsd = winRateTotalLossDisplayUsd(row)
  return (
    <div className={cn(inTotals ? winRateTotalsSectionClass : winRateSectionClass)}>
      <div className={inTotals ? winRateTotalsSectionLabelClass : winRateSectionLabelClass}>
        P&amp;L
      </div>
      <div className={winRateMetrics3Class}>
        <PnlMetric
          label="Total profit"
          value={fmtUsd(winRateTotalProfitDisplayUsd(row))}
          tone={winRateTotalProfitTone(row)}
          title="Sum of execution-derived Net PnL for instances with strictly positive net"
          inTotals={inTotals}
        />
        <PnlMetric
          label="Total loss"
          value={totalLossUsd != null ? fmtUsd(totalLossUsd) : '—'}
          tone={winRateTotalLossTone(row)}
          title="Sum of Net PnL for instances with strictly negative net. $0.00 when Loss count is 0"
          inTotals={inTotals}
        />
        <PnlMetric
          label="Structure return"
          value={fmtStructureReturnPct(row.structure_return_pct)}
          tone={structureReturnTone(row.structure_return_pct)}
          title="Structure return % = total net PnL / total max risk × 100"
          inTotals={inTotals}
        />
      </div>
    </div>
  )
}
