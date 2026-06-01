import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import styles from '../PositionsChartsSection.module.css'

export function PositionsChartCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(styles.chartInner, className)}>{children}</div>
}

export function DonutChartRow({
  title,
  alignStart,
  children,
}: {
  title?: string
  alignStart?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-w-0 w-full">
      {title ? <p className={styles.chartBlockTitle}>{title}</p> : null}
      <div className={cn(styles.donutRow, alignStart && styles.donutRowStart)}>{children}</div>
    </div>
  )
}
