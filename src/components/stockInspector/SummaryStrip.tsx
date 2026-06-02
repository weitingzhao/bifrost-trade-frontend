import { cn } from '@/lib/utils'
import styles from './stock-inspector.module.css'

interface Props {
  label: string
  value: string
  ok?: boolean
  className?: string
}

export function SummaryStrip({ label, value, ok = false, className }: Props) {
  return (
    <div
      className={cn(
        styles.summaryRow,
        ok ? styles.summaryOk : styles.summaryWarn,
        className,
      )}
    >
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  )
}
