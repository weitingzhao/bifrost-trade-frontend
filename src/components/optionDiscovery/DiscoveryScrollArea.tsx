import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Vertical scroll region with thin scrollbar (Discovery strike ladder, tables). */
export function DiscoveryScrollArea({
  className,
  children,
  maxHeightClass = 'max-h-56',
}: {
  className?: string
  children: ReactNode
  maxHeightClass?: string
}) {
  return (
    <div
      className={cn(
        'overflow-y-auto overscroll-contain [scrollbar-width:thin]',
        maxHeightClass,
        className,
      )}
    >
      {children}
    </div>
  )
}
