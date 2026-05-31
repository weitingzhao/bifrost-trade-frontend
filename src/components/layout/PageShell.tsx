import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PageShellPadding = 'default' | 'compact' | 'none'

const paddingClass: Record<PageShellPadding, string> = {
  default: 'p-6',
  compact: 'p-4',
  none: '',
}

export interface PageShellProps {
  children: ReactNode
  /** Outer padding; layout main may already be card-colored — pages add spacing here. */
  padding?: PageShellPadding
  className?: string
}

/**
 * Page canvas: same surface as sidebar (bg-card). Use elevated Card / bg-secondary inside.
 */
export function PageShell({ children, padding = 'default', className }: PageShellProps) {
  return (
    <div
      className={cn(
        'min-h-full bg-card text-card-foreground',
        paddingClass[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
