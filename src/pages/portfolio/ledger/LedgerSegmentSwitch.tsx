import { cn } from '@/lib/utils'
import styles from './TradeLedgerPage.module.css'

export function LedgerSegmentSwitch({
  children,
  className,
  role,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  role?: string
  'aria-label'?: string
}) {
  return (
    <div
      className={cn(styles.segmentSwitch, className)}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

export function LedgerSegmentBtn({
  active,
  onClick,
  disabled,
  children,
  role,
  'aria-selected': ariaSelected,
  'aria-checked': ariaChecked,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  role?: string
  'aria-selected'?: boolean
  'aria-checked'?: boolean
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={ariaSelected}
      aria-checked={ariaChecked}
      disabled={disabled}
      onClick={onClick}
      className={cn(styles.segmentBtn, active && styles.segmentBtnActive)}
    >
      {children}
    </button>
  )
}
