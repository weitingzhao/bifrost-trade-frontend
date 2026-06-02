import { cn } from '@/lib/utils'
import styles from './stock-inspector.module.css'

interface Props {
  pass: boolean
  className?: string
}

export function ConditionIcon({ pass, className }: Props) {
  return (
    <span
      className={cn(
        styles.condIconBadge,
        pass ? styles.condIconBadgePass : styles.condIconBadgeFail,
        className,
      )}
      aria-hidden
    >
      {pass ? '✓' : '✕'}
    </span>
  )
}
