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
  variant?: 'default' | 'stock' | 'coverage' | 'option'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'font-semibold text-left hover:underline',
        variant === 'coverage' && 'text-sky-600 dark:text-sky-400',
        variant === 'option' && 'text-sky-600 dark:text-sky-400 font-mono',
        (variant === 'default' || variant === 'stock') && 'text-primary',
        className,
      )}
    >
      {label}
    </button>
  )
}

/** @deprecated Use DenseLinkButton */
export const SymbolLinkButton = DenseLinkButton
