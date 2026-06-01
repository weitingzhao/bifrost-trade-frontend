import { ledgerBubbleBtn } from '@/lib/ledgerUi'

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
      className={ledgerBubbleBtn(active)}
    >
      {children}
    </button>
  )
}
