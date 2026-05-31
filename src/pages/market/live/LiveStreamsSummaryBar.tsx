import { cn } from '@/lib/utils'
import styles from './live.module.css'

interface Props {
  sinceDollar: number
  sincePct: number | null
  dailyDollar: number
  dailyPct: number | null
  visible: boolean
}

function pnlClass(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return ''
  return v >= 0 ? styles.pnlPositive : styles.pnlNegative
}

export function LiveStreamsSummaryBar({ sinceDollar, sincePct, dailyDollar, dailyPct, visible }: Props) {
  if (!visible) return null

  const showDaily = dailyPct != null || dailyDollar !== 0

  return (
    <div className={styles.summaryBar} role="status" aria-label="STK streams summary">
      <span className={styles.summaryLabel}>STK Streams</span>
      <span className={styles.summarySeg}>
        <span className={styles.summaryKey}>SINCE $</span>
        <span className={cn(styles.summaryVal, pnlClass(sinceDollar))}>
          {sinceDollar.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
        </span>
      </span>
      {sincePct != null && Number.isFinite(sincePct) && (
        <span className={styles.summarySeg}>
          <span className={styles.summaryKey}>SINCE %</span>
          <span className={cn(styles.summaryVal, pnlClass(sincePct))}>
            {sincePct >= 0 ? '+' : ''}{sincePct.toFixed(2)}%
          </span>
        </span>
      )}
      {showDaily && (
        <>
          <span className={styles.summaryDivider} aria-hidden>|</span>
          <span className={styles.summarySeg}>
            <span className={styles.summaryKey}>DAILY $</span>
            <span className={cn(styles.summaryVal, pnlClass(dailyDollar))}>
              {dailyDollar.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
            </span>
          </span>
          {dailyPct != null && Number.isFinite(dailyPct) && (
            <span className={styles.summarySeg}>
              <span className={styles.summaryKey}>DAILY %</span>
              <span className={cn(styles.summaryVal, pnlClass(dailyPct))}>
                {dailyPct >= 0 ? '+' : ''}{dailyPct.toFixed(2)}%
              </span>
            </span>
          )}
        </>
      )}
    </div>
  )
}
