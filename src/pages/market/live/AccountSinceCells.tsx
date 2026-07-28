import type { ReactNode } from 'react'
import { DenseTableCell, InlinePnl, denseTableNumCell } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import {
  sincePctFromAvg,
  sincePctFromBasis,
  type AccountMetrics,
} from '@/utils/streamAccountView'
import { liveTable } from './liveTableClasses'

function fmtPnlNode(n: number | null | undefined): ReactNode {
  if (n == null || !Number.isFinite(n)) return '—'
  return <InlinePnl value={n}>{fmtUsd(n, true)}</InlinePnl>
}

function fmtPctNode(n: number | null | undefined): ReactNode {
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

interface Props {
  metrics: AccountMetrics
  lastPrice?: number | null
  useBasisPct?: boolean
}

/** Since $ / Since % for merged Host+Secondary account columns. */
export function AccountSinceCells({ metrics, lastPrice = null, useBasisPct = false }: Props) {
  if (metrics.kind === 'single') {
    const costBasis =
      metrics.qty != null && Number.isFinite(metrics.qty) && metrics.avgCost != null
        ? metrics.qty * metrics.avgCost
        : metrics.avgCost
    const pct = useBasisPct
      ? sincePctFromBasis(costBasis, metrics.pnl)
      : sincePctFromAvg(metrics.avgCost, lastPrice)
    return (
      <>
        <DenseTableCell className={denseTableNumCell}>{fmtPnlNode(metrics.pnl)}</DenseTableCell>
        <DenseTableCell className={denseTableNumCell}>{fmtPctNode(pct)}</DenseTableCell>
      </>
    )
  }

  const hostBasis =
    metrics.hostQty != null && Number.isFinite(metrics.hostQty) && metrics.hostAvgCost != null
      ? metrics.hostQty * metrics.hostAvgCost
      : metrics.hostAvgCost
  const secondaryBasis =
    metrics.secondaryQty != null &&
    Number.isFinite(metrics.secondaryQty) &&
    metrics.secondaryAvgCost != null
      ? metrics.secondaryQty * metrics.secondaryAvgCost
      : metrics.secondaryAvgCost

  const hostPct = useBasisPct
    ? sincePctFromBasis(hostBasis, metrics.hostPnl)
    : sincePctFromAvg(metrics.hostAvgCost, lastPrice)
  const secondaryPct = useBasisPct
    ? sincePctFromBasis(secondaryBasis, metrics.secondaryPnl)
    : sincePctFromAvg(metrics.secondaryAvgCost, lastPrice)

  return (
    <>
      <DenseTableCell className={denseTableNumCell}>
        <Split left={fmtPnlNode(metrics.hostPnl)} right={fmtPnlNode(metrics.secondaryPnl)} />
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <Split left={fmtPctNode(hostPct)} right={fmtPctNode(secondaryPct)} />
      </DenseTableCell>
    </>
  )
}
