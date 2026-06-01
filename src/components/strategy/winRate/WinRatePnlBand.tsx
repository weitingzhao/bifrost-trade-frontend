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
import styles from './winRate.module.css'
import { kpiToneClass } from './toneClasses'

function PnlMetric({
  label,
  value,
  tone,
  title,
}: {
  label: string
  value: string
  tone: ReturnType<typeof winRateTotalProfitTone>
  title?: string
}) {
  return (
    <div className={styles.metric} title={title}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={cn(styles.metricValue, styles.metricValuePnl, kpiToneClass(tone))}>
        {value}
      </span>
    </div>
  )
}

export function WinRatePnlBand({ row }: { row: WinRateStructureRow }) {
  const totalLossUsd = winRateTotalLossDisplayUsd(row)
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>P&amp;L</div>
      <div className={styles.metrics3}>
        <PnlMetric
          label="Total profit"
          value={fmtUsd(winRateTotalProfitDisplayUsd(row))}
          tone={winRateTotalProfitTone(row)}
          title="Sum of execution-derived Net PnL for instances with strictly positive net"
        />
        <PnlMetric
          label="Total loss"
          value={totalLossUsd != null ? fmtUsd(totalLossUsd) : '—'}
          tone={winRateTotalLossTone(row)}
          title="Sum of Net PnL for instances with strictly negative net. $0.00 when Loss count is 0"
        />
        <PnlMetric
          label="Structure return"
          value={fmtStructureReturnPct(row.structure_return_pct)}
          tone={structureReturnTone(row.structure_return_pct)}
          title="Structure return % = total net PnL / total max risk × 100"
        />
      </div>
    </div>
  )
}
