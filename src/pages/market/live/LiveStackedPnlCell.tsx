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
  /** Single-line % + $ (default for merged account columns layout). */
  inline?: boolean
}

/** Live Daily/SINCE columns: inline % $ by default; stacked when inline={false}. */
export function LiveStackedPnlCell({
  pct,
  dollar,
  formatPct,
  formatDollar,
  className,
  emptyPct = '—',
  emptyDollar = '—',
  inline = true,
}: Props) {
  const hasPct = pct != null && Number.isFinite(pct)
  const hasDollar = dollar != null && Number.isFinite(dollar)

  if (inline) {
    return (
      <span className={cn('font-mono tabular-nums text-right whitespace-nowrap', className)}>
        {hasPct ? <InlinePnl value={pct}>{formatPct(Math.abs(pct))}</InlinePnl> : emptyPct}
        {hasDollar ? (
          <span className={liveTable.inlinePnlDollar}>
            {' '}
            <InlinePnl value={dollar}>{formatDollar(dollar)}</InlinePnl>
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <div className={cn(liveTable.stackedPnlLines, 'font-mono tabular-nums', className)}>
      <span className={liveTable.stackedPnlLine}>
        {hasPct ? <InlinePnl value={pct}>{formatPct(Math.abs(pct))}</InlinePnl> : emptyPct}
      </span>
      <span className={cn(liveTable.stackedPnlLine, liveTable.stackedPnlLineGap)}>
        {hasDollar ? (
          <InlinePnl value={dollar}>{formatDollar(dollar)}</InlinePnl>
        ) : (
          emptyDollar
        )}
      </span>
    </div>
  )
}
