import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'

export function InlinePnl({
  value,
  children,
  className,
}: {
  value: number | null | undefined
  children: ReactNode
  className?: string
}) {
  return <span className={cn(pnlColorClass(value), className)}>{children}</span>
}

export function PnlCell({
  dollar,
  pct,
  formatDollar,
  formatPct,
}: {
  dollar: number | null | undefined
  pct: number | null | undefined
  formatDollar: (v: number | null | undefined) => string
  formatPct: (v: number | null | undefined) => string
}) {
  return (
    <div className="text-right leading-snug font-mono tabular-nums">
      <div className={pnlColorClass(dollar)}>{formatDollar(dollar)}</div>
      <div className={cn('text-dense-meta', pnlColorClass(pct))}>
        {formatPct(pct)}
      </div>
    </div>
  )
}
