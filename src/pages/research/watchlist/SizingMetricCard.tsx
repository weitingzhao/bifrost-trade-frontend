import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  sizingDashCardClass,
  sizingDashCardHighlightClass,
  sizingDashLabelClass,
  sizingDashLabelHighlightClass,
  sizingDashValueClass,
  sizingDashValueHighlightClass,
  sizingDashValueWarnClass,
} from './sizingUi'

export function SizingMetricCard({
  label,
  value,
  highlight,
  warn,
  className,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
  warn?: boolean
  className?: string
}) {
  return (
    <div className={cn(sizingDashCardClass, highlight && sizingDashCardHighlightClass, className)}>
      <span className={highlight ? sizingDashLabelHighlightClass : sizingDashLabelClass}>{label}</span>
      <span
        className={cn(
          highlight ? sizingDashValueHighlightClass : sizingDashValueClass,
          warn && sizingDashValueWarnClass,
        )}
      >
        {value}
      </span>
    </div>
  )
}
