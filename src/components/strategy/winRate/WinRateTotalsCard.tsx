import type { WinRateStructureRow } from '@/types/strategy'
import styles from '@/pages/strategy/WinRatePage.module.css'
import { WinRateTradesBand } from './WinRateTradesBand'
import { WinRatePnlBand } from './WinRatePnlBand'
import { WinRateUnderlyingBand } from './WinRateUnderlyingBand'
import { WinRateAveragesBand } from './WinRateAveragesBand'

export function WinRateTotalsCard({ totals }: { totals: WinRateStructureRow }) {
  return (
    <article className={styles.totalsCard}>
      <h3 className={styles.cardTitle}>All structures</h3>
      <div className={styles.totalsPanel}>
        <div className={styles.totalsRow}>
          <div className={styles.totalsBand}>
            <WinRateTradesBand row={totals} />
          </div>
          <div className={styles.totalsBand}>
            <WinRatePnlBand row={totals} />
          </div>
          <div className={styles.totalsBand}>
            <WinRateUnderlyingBand row={totals} />
          </div>
          <div className={styles.totalsBand}>
            <WinRateAveragesBand row={totals} layout="totals" />
          </div>
        </div>
      </div>
    </article>
  )
}
