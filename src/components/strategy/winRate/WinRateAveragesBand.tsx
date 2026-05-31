import type { WinRateStructureRow } from '@/types/strategy'
import { fmtUsd } from '@/utils/positions'
import { fmtWinRatePct } from '@/utils/winRate'
import { cn } from '@/lib/utils'
import styles from '@/pages/strategy/WinRatePage.module.css'
import { WinRateKpi } from './WinRateKpi'
import { kpiToneClass } from './toneClasses'
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
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={cn(styles.metricValue, kpiToneClass(tone))}>{value}</span>
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
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Averages</div>
        <div className={styles.averagesTotals}>
          <WinRateKpi label="Profit avg %" value={fmtWinRatePct(row.profit_avg_pct)} tone="positive" />
          <WinRateKpi label="Loss avg %" value={fmtWinRatePct(row.loss_avg_pct)} tone="negative" />
          <WinRateKpi label="Max loss %" value={fmtWinRatePct(row.single_max_loss_pct)} tone="negative" />
          <WinRateKpi
            label="Profit avg $"
            value={row.profit_avg_usd != null ? fmtUsd(row.profit_avg_usd) : '—'}
            tone="positive"
          />
          <WinRateKpi
            label="Loss avg $"
            value={row.loss_avg_usd != null ? fmtUsd(row.loss_avg_usd) : '—'}
            tone="negative"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Averages</div>
      <div className={styles.metricsWrap}>
        <AverageMetric label="Profit avg %" value={fmtWinRatePct(row.profit_avg_pct)} tone="positive" />
        <AverageMetric label="Loss avg %" value={fmtWinRatePct(row.loss_avg_pct)} tone="negative" />
        <AverageMetric label="Max loss %" value={fmtWinRatePct(row.single_max_loss_pct)} tone="negative" />
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
