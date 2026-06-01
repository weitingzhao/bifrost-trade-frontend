import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { cn } from '@/lib/utils'

export interface CelerySectionCardProps {
  title: ReactNode
  tooltip?: string
  headerExtra?: ReactNode
  contentClassName?: string
  className?: string
  children: ReactNode
}

export function CelerySectionCard({
  title,
  tooltip,
  headerExtra,
  contentClassName,
  className,
  children,
}: CelerySectionCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 min-w-0">
            {title}
            {tooltip ? <InfoTooltip text={tooltip} /> : null}
          </span>
          {headerExtra ? <span className="ml-auto shrink-0">{headerExtra}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  )
}
