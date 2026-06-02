import type { WinRateStructureRow } from '@/types/strategy'
import { winPctLabel, winPctTone } from '@/utils/winRate'
import {
  winRateKpiGridClass,
  winRateSectionClass,
  winRateSectionLabelClass,
  winRateTotalsSectionClass,
  winRateTotalsSectionLabelClass,
} from './winRateUi'
import { cn } from '@/lib/utils'
import { WinRateKpi } from './WinRateKpi'

export function WinRateTradesBand({
  row,
  inTotals = false,
}: {
  row: WinRateStructureRow
  inTotals?: boolean
}) {
  const tone = winPctTone(row.total_instances, row.profit_trades)
  return (
    <div className={cn(inTotals ? winRateTotalsSectionClass : winRateSectionClass)}>
      <div className={inTotals ? winRateTotalsSectionLabelClass : winRateSectionLabelClass}>
        Trades
      </div>
      <div className={winRateKpiGridClass}>
        <WinRateKpi
          label="Profit"
          value={String(row.profit_trades)}
          tone="positive"
          title="Instances with net PnL > 0"
        />
        <WinRateKpi
          label="Loss"
          value={String(row.loss_trades)}
          tone="negative"
          title="Instances with net PnL ≤ 0"
        />
        <WinRateKpi
          label="Total"
          value={String(row.total_instances)}
          tone="muted"
          title="Total closed instances"
        />
        <WinRateKpi
          label="Win %"
          value={winPctLabel(row.total_instances, row.profit_trades)}
          tone={tone}
          highlight
          winPctSize
          title="profit ÷ total × 100"
        />
      </div>
    </div>
  )
}
