import type { ReactNode } from 'react'
import { DenseTableCell, denseTableNumCell } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import type { AccountMetrics } from '@/utils/streamAccountView'
import { liveTable } from './liveTableClasses'

function fmtQty(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return String(n)
}

function fmtCost(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return fmtUsd(n)
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

/** Qty / Cost for merged Host+Secondary account columns. */
export function AccountMetricCells({ metrics }: { metrics: AccountMetrics }) {
  if (metrics.kind === 'single') {
    return (
      <>
        <DenseTableCell className={denseTableNumCell}>{fmtQty(metrics.qty)}</DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>{fmtCost(metrics.avgCost)}</DenseTableCell>
      </>
    )
  }

  return (
    <>
      <DenseTableCell className={denseTableNumCell}>
        <Split left={fmtQty(metrics.hostQty)} right={fmtQty(metrics.secondaryQty)} />
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <Split left={fmtCost(metrics.hostAvgCost)} right={fmtCost(metrics.secondaryAvgCost)} />
      </DenseTableCell>
    </>
  )
}
