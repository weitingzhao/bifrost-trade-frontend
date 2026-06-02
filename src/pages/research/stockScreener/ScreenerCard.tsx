import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  screenerCardClass,
  screenerCardStackedClass,
  screenerCardTitleClass,
  screenerFilterBadgeClass,
} from './stockScreenerUi'

type Props = {
  title?: ReactNode
  titleClassName?: string
  accentClassName?: string
  stacked?: boolean
  badgeCount?: number
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function ScreenerCard({
  title,
  titleClassName,
  accentClassName,
  stacked = false,
  badgeCount,
  actions,
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        screenerCardClass,
        stacked && screenerCardStackedClass,
        accentClassName,
        className,
      )}
    >
      {(title != null || actions != null) && (
        <div className="mb-2 flex flex-row items-center justify-between gap-2">
          {title != null && (
            <h3 className={cn(screenerCardTitleClass, titleClassName, 'flex items-center gap-1.5')}>
              {title}
              {badgeCount != null && badgeCount > 0 && (
                <span className={screenerFilterBadgeClass}>{badgeCount}</span>
              )}
            </h3>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
