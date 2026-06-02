import { cn } from '@/lib/utils'
import { InlinePnl } from '@/components/data-display'
import { liveTable } from './liveTableClasses'

interface Props {
  pct: number | null | undefined
  dollar: number | null | undefined
  formatPct: (v: number) => string
  formatDollar: (v: number | null | undefined) => string
  className?: string
  emptyPct?: string
  emptyDollar?: string
}

/** Live Daily/SINCE columns: % on first line, $ on second (inverse of PnlCell). */
export function LiveStackedPnlCell({
  pct,
  dollar,
  formatPct,
  formatDollar,
  className,
  emptyPct = '—',
  emptyDollar = '—',
}: Props) {
  return (
    <div className={cn(liveTable.stackedPnlLines, 'font-mono tabular-nums', className)}>
      <span className={liveTable.stackedPnlLine}>
        {pct != null && Number.isFinite(pct) ? (
          <InlinePnl value={pct}>{formatPct(Math.abs(pct))}</InlinePnl>
        ) : (
          emptyPct
        )}
      </span>
      <span className={cn(liveTable.stackedPnlLine, liveTable.stackedPnlLineGap)}>
        {dollar != null && Number.isFinite(dollar) ? (
          <InlinePnl value={dollar}>{formatDollar(dollar)}</InlinePnl>
        ) : (
          emptyDollar
        )}
      </span>
    </div>
  )
}
