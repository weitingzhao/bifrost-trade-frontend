import { segmentButtonClass } from '@/components/data-display'

type Props = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

/** @deprecated Prefer SegmentControl or direct segmentButtonClass usage. */
export function LedgerBubbleBtn({ active, onClick, children, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={segmentButtonClass(active, 'sm')}
    >
      {children}
    </button>
  )
}
