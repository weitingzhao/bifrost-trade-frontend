import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function IconActionButton({
  onClick,
  title,
  ariaLabel,
  tone = 'default',
  size = 'dense',
  disabled,
  children,
  className,
}: {
  onClick: (e: React.MouseEvent) => void
  title: string
  ariaLabel: string
  tone?: 'default' | 'danger' | 'warn'
  size?: 'dense' | 'icon'
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        size === 'dense' && 'h-7 w-7',
        tone === 'danger' && 'text-destructive hover:text-destructive',
        tone === 'warn' && 'text-amber-600 dark:text-amber-400 hover:text-amber-600',
        className,
      )}
    >
      {children}
    </Button>
  )
}
