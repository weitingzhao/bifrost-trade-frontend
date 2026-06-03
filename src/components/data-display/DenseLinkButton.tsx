import { cn } from '@/lib/utils'

export function DenseLinkButton({
  label,
  onClick,
  ariaLabel,
  variant = 'default',
  className,
}: {
  label: string
  onClick: () => void
  ariaLabel: string
  variant?: 'default' | 'stock' | 'coverage' | 'option' | 'strategy' | 'instance'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'font-semibold text-left hover:underline',
        variant === 'coverage' && 'text-entity-option',
        variant === 'option' && 'text-entity-option font-mono',
        variant === 'strategy' && 'text-entity-strategy',
        variant === 'instance' && 'text-entity-instance font-mono',
        (variant === 'default' || variant === 'stock') && 'text-entity-symbol',
        className,
      )}
    >
      {label}
    </button>
  )
}

/** @deprecated Use DenseLinkButton */
export const SymbolLinkButton = DenseLinkButton
