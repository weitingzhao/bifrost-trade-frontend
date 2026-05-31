import type { WinRateStructureRow } from '@/types/strategy'
import { winPctLabel, winPctTone } from '@/utils/winRate'
import styles from '@/pages/strategy/WinRatePage.module.css'
import { WinRateKpi } from './WinRateKpi'

export function WinRateTradesBand({ row }: { row: WinRateStructureRow }) {
  const tone = winPctTone(row.total_instances, row.profit_trades)
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Trades</div>
      <div className={styles.kpiGrid}>
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
