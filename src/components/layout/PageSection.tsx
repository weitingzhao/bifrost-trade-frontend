import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PageSectionProps {
  children: ReactNode
  title?: string
  description?: string
  /** First section on page — no top border. */
  first?: boolean
  className?: string
}

/**
 * Vertical section spacing (replaces legacy .replay-section borders without legacy CSS).
 */
export function PageSection({
  children,
  title,
  description,
  first = false,
  className,
}: PageSectionProps) {
  return (
    <section
      className={cn(
        !first && 'border-t border-border pt-6 mt-6',
        first && 'mt-0',
        className,
      )}
    >
      {(title != null || description != null) && (
        <div className="mb-4 space-y-0.5">
          {title != null && (
            <h2 className="text-base font-medium tracking-tight">{title}</h2>
          )}
          {description != null && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
