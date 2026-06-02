import type { WinRateStructureRow } from '@/types/strategy'
import { fmtUsd } from '@/utils/positions'
import { cn } from '@/lib/utils'
import {
  winRateSectionClass,
  winRateSectionLabelClass,
  winRateTotalsBandUnderlyingLabelClass,
  winRateTotalsBandUnderlyingValueClass,
  winRateTotalsSectionClass,
  winRateTotalsSectionLabelClass,
  winRateUnderlyingRowClass,
  winRateUnderlyingRowLabelClass,
  winRateUnderlyingRowValueClass,
  winRateUnderlyingRowsClass,
} from './winRateUi'

const UNDERLYING_TITLE =
  'Same as Instance detail: sum of sell OPT strike × |qty| × 100 per instance. Buckets follow net PnL > 0 vs ≤ 0.'

function UnderlyingRow({
  label,
  value,
  title,
  inTotals = false,
}: {
  label: string
  value: string
  title?: string
  inTotals?: boolean
}) {
  return (
    <div className={winRateUnderlyingRowClass}>
      <span
        className={cn(
          winRateUnderlyingRowLabelClass,
          inTotals && winRateTotalsBandUnderlyingLabelClass,
        )}
        title={title}
      >
        {label}
      </span>
      <span
        className={cn(
          winRateUnderlyingRowValueClass,
          inTotals && winRateTotalsBandUnderlyingValueClass,
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function WinRateUnderlyingBand({
  row,
  inTotals = false,
}: {
  row: WinRateStructureRow
  inTotals?: boolean
}) {
  return (
    <div className={cn(inTotals ? winRateTotalsSectionClass : winRateSectionClass)}>
      <div
        className={inTotals ? winRateTotalsSectionLabelClass : winRateSectionLabelClass}
        title={UNDERLYING_TITLE}
      >
        Underlying cost
      </div>
      <div className={winRateUnderlyingRowsClass}>
        <UnderlyingRow
          label="On wins"
          value={fmtUsd(row.profit_investment, true)}
          title="Instances with net PnL > 0"
          inTotals={inTotals}
        />
        <UnderlyingRow
          label="On losses"
          value={fmtUsd(row.loss_investment, true)}
          title="Instances with net PnL ≤ 0"
          inTotals={inTotals}
        />
        <UnderlyingRow
          label="Total"
          value={fmtUsd(row.total_investment, true)}
          title="On wins + on losses"
          inTotals={inTotals}
        />
      </div>
    </div>
  )
}
