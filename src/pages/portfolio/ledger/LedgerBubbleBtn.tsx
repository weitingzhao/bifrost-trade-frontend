import { cn } from '@/lib/utils'
import styles from './TradeLedgerPage.module.css'

type Props = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

export function LedgerBubbleBtn({ active, onClick, children, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(styles.bubbleBtn, active && styles.bubbleBtnActive)}
    >
      {children}
    </button>
  )
}
