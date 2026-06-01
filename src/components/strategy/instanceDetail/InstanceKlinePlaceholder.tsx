import type { Execution } from '@/types/positions'
import styles from './InstanceDetail.module.css'

interface Props {
  executions: Execution[]
}

/** Section shell until Instance K-line chart is migrated from Legacy. */
export function InstanceKlinePlaceholder({ executions }: Props) {
  const hasSymbol = executions.some((e) => (e.symbol ?? '').trim())
  if (!hasSymbol) return null

  const opt = executions.find((e) => (e.sec_type ?? '').toUpperCase() === 'OPT' && e.symbol)
  const label = opt
    ? `${(opt.symbol ?? '').trim().split(/\s+/)[0]} — option contract`
    : (executions.find((e) => e.symbol)?.symbol ?? '').trim()

  return (
    <section className={styles.klineSection} aria-label="K-line chart">
      <h3 className={styles.sectionTitle}>K-line Chart</h3>
      <div className={styles.klinePanel}>
        <p className={styles.klineHint}>
          {label ? `${label} — ` : ''}
          Interactive bars chart migration in progress.
        </p>
      </div>
    </section>
  )
}
