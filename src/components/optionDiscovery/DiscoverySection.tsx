import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DiscoverySectionProps {
  children: ReactNode
  /** First block in a stack — no top border. */
  first?: boolean
  className?: string
  'aria-label'?: string
  id?: string
}

/** Section spacing (replaces legacy `.replay-section` in Discovery). */
export function DiscoverySection({
  children,
  first = false,
  className,
  ...rest
}: DiscoverySectionProps) {
  return (
    <section
      className={cn(
        !first && 'mt-5 border-t border-border pt-4',
        first && 'mt-0 pt-0',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}
