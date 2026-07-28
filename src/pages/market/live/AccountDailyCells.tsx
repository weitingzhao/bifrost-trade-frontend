import type { ReactNode } from 'react'
import { DenseTableCell, InlinePnl, denseTableNumCell } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { DailyMetrics } from '@/utils/streamAccountView'
import { liveTable } from './liveTableClasses'

function fmtDollar(n: number | null | undefined): ReactNode {
  if (n == null || !Number.isFinite(n)) return '—'
  return <InlinePnl value={n}>{fmtUsd(Math.abs(n))}</InlinePnl>
}

function fmtPct(n: number | null | undefined): ReactNode {
  if (n == null || !Number.isFinite(n)) return '—'
  return <InlinePnl value={n}>{`${Math.abs(n).toFixed(2)}%`}</InlinePnl>
}

function Split({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      {left}
      <span className={liveTable.accountSplitSep}>/</span>
      {right}
    </span>
  )
}

/** Daily $ / Daily % cells (account view aware). */
export function AccountDailyCells({
  metrics,
  className,
  children,
}: {
  metrics: DailyMetrics
  className?: string
  /** Optional overlay (e.g. DailyCalcBreakdown) inside the Daily $ cell. */
  children?: ReactNode
}) {
  if (metrics.kind === 'single') {
    return (
      <>
        <DenseTableCell className={className ?? denseTableNumCell}>
          {fmtDollar(metrics.dollar)}
          {children}
        </DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>{fmtPct(metrics.pct)}</DenseTableCell>
      </>
    )
  }

  return (
    <>
      <DenseTableCell className={className ?? denseTableNumCell}>
        <Split left={fmtDollar(metrics.hostDollar)} right={fmtDollar(metrics.secondaryDollar)} />
        {children}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <Split left={fmtPct(metrics.hostPct)} right={fmtPct(metrics.secondaryPct)} />
      </DenseTableCell>
    </>
  )
}
