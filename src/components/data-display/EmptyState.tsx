import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-8 text-center',
        className,
      )}
    >
      {icon && (
        <div className="text-muted-foreground/60 [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground/80">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
