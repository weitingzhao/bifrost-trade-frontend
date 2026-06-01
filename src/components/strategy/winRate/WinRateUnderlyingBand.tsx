import type { WinRateStructureRow } from '@/types/strategy'
import { fmtUsd } from '@/utils/positions'
import styles from './winRate.module.css'

const UNDERLYING_TITLE =
  'Same as Instance detail: sum of sell OPT strike × |qty| × 100 per instance. Buckets follow net PnL > 0 vs ≤ 0.'

function UnderlyingRow({
  label,
  value,
  title,
}: {
  label: string
  value: string
  title?: string
}) {
  return (
    <div className={styles.underlyingRow}>
      <span className={styles.metricLabel} title={title}>
        {label}
      </span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  )
}

export function WinRateUnderlyingBand({ row }: { row: WinRateStructureRow }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel} title={UNDERLYING_TITLE}>
        Underlying cost
      </div>
      <div className={styles.underlyingRows}>
        <UnderlyingRow
          label="On wins"
          value={fmtUsd(row.profit_investment, true)}
          title="Instances with net PnL > 0"
        />
        <UnderlyingRow
          label="On losses"
          value={fmtUsd(row.loss_investment, true)}
          title="Instances with net PnL ≤ 0"
        />
        <UnderlyingRow
          label="Total"
          value={fmtUsd(row.total_investment, true)}
          title="On wins + on losses"
        />
      </div>
    </div>
  )
}
