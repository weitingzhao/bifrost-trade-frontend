import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtPctCompact, fmtTradeDate, fmtTs, fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import {
  stkCostBasisFromSnapshot,
  stkNotionalAbsUsd,
  stkNotionalTone,
  stkPctOf,
} from '@/utils/ledger/stkDisplay'
import { pnlColorClass } from '@/utils/dailyChange'
import { ledgerStkPnlClass } from './ledgerStkPnl'
import {
  stkGroupBasisClass,
  stkGroupMetaClass,
  stkGroupSnapLabelClass,
} from './ledgerSharedClasses'
import { DenseTableCell, DenseTableHead, denseTable, denseTableNumCell } from '@/components/data-display'

export function LedgerStkNotionalCell({ ex }: { ex: Execution }) {
  const n = stkNotionalAbsUsd(ex)
  const tone = stkNotionalTone(ex)
  const toneClass =
    tone === 'buy' ? pnlColorClass(1) : tone === 'sell' ? pnlColorClass(-1) : 'text-muted-foreground'
  return (
    <DenseTableCell className={denseTableNumCell}>
      <span className={toneClass}>{n != null ? fmtUsd(n) : '—'}</span>
    </DenseTableCell>
  )
}

export function LedgerStkRowRealizedCell({ realized }: { realized: number }) {
  const isZero = !Number.isFinite(realized) || Math.abs(realized) < 0.005
  return (
    <DenseTableCell className={denseTableNumCell}>
      {isZero ? (
        <span className="whitespace-nowrap text-muted-foreground">—</span>
      ) : (
        <span className={cn('whitespace-nowrap', ledgerStkPnlClass(realized))}>
          {fmtUsdRound(realized)}
        </span>
      )}
    </DenseTableCell>
  )
}

export function LedgerStkUrPnlGroupInline({
  realized,
  unrealized,
}: {
  realized: number
  unrealized: number | null | undefined
}) {
  const uFinite = unrealized != null && Number.isFinite(unrealized)
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-[0.88em] font-semibold tabular-nums">
      <span className="text-[0.72em] font-semibold uppercase tracking-wide text-muted-foreground">
        Group U/R PnL
      </span>
      <span className="inline-flex flex-wrap items-baseline gap-x-1">
        <span className={ledgerStkPnlClass(realized)}>
          <span className="mr-0.5 font-semibold opacity-90">R</span>
          {fmtUsdRound(realized)}
        </span>
        <span className="text-muted-foreground/60" aria-hidden>
          ·
        </span>
        <span className={uFinite ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
          <span className="mr-0.5 font-semibold opacity-90">U</span>
          {uFinite ? fmtUsdRound(unrealized as number) : '—'}
        </span>
      </span>
    </span>
  )
}

export function LedgerStkSortableTh({
  label,
  active,
  dir,
  onClick,
  tooltip,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  tooltip?: string
}) {
  return (
    <DenseTableHead
      className={denseTable.sortableHead}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      title={`Sort by ${label}`}
    >
      {label}
      {tooltip ? (
        <>
          {' '}
          <InfoTooltip text={tooltip} />
        </>
      ) : null}{' '}
      {active ? (dir === 'asc' ? '▲' : '▼') : ''}
    </DenseTableHead>
  )
}

export function LedgerStkTimeCells({ ex }: { ex: Execution }) {
  return (
    <>
      <DenseTableCell>{ex.time != null ? fmtTs(ex.time) : '—'}</DenseTableCell>
      <DenseTableCell>{fmtTradeDate(ex.trade_date)}</DenseTableCell>
    </>
  )
}

export function LedgerStkGroupBasisPct({
  snap,
  realized,
  unrealized,
}: {
  snap: { position: number; avgCost: number; price: number | null } | undefined
  realized: number
  unrealized: number | null | undefined
}) {
  const costBaseUsd = stkCostBasisFromSnapshot(snap)
  const costBaseStr = costBaseUsd != null ? fmtUsdRound(costBaseUsd) : '—'
  const uDollar = unrealized != null && Number.isFinite(unrealized) ? unrealized : null
  const rPct = stkPctOf(realized, costBaseUsd)
  const uPct = uDollar != null ? stkPctOf(uDollar, costBaseUsd) : null
  const rPctStr = rPct != null ? fmtPctCompact(rPct) : '—'
  const uPctStr = uPct != null ? fmtPctCompact(uPct) : '—'

  return (
    <span
      className={stkGroupBasisClass}
      title="Cost basis = |position| × avg cost (from GET /status). R% and U% are realized and unrealized PnL as a percentage of that basis (not annualized)."
    >
      <span className={stkGroupSnapLabelClass}>Basis</span> {costBaseStr}
      <span className="text-muted-foreground/60" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={stkGroupSnapLabelClass}>R%</span>{' '}
      <span className={rPct != null ? ledgerStkPnlClass(rPct) : 'text-muted-foreground'}>
        {rPctStr}
      </span>
      <span className="text-muted-foreground/60" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={stkGroupSnapLabelClass}>U%</span>{' '}
      <span className={uPct != null ? ledgerStkPnlClass(uPct) : 'text-muted-foreground'}>
        {uPctStr}
      </span>
    </span>
  )
}

export function LedgerStkGroupPositionSnap({
  snap,
}: {
  snap: { position: number; avgCost: number; price: number | null } | undefined
}) {
  const posSnapStr =
    snap?.position != null && Number.isFinite(snap.position)
      ? snap.position.toLocaleString('en-US', { maximumFractionDigits: 6 })
      : '—'
  const avgSnapStr =
    snap?.avgCost != null && Number.isFinite(snap.avgCost) ? fmtUsd(snap.avgCost) : '—'
  const mktSnapStr =
    snap?.price != null && Number.isFinite(snap.price) ? fmtUsd(snap.price) : '—'

  return (
    <span
      className={stkGroupMetaClass}
      title="Current position snapshot from GET /status (portfolio positions); same source as U."
    >
      <span className={stkGroupSnapLabelClass}>Pos</span> {posSnapStr}
      <span className="text-muted-foreground/60" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={stkGroupSnapLabelClass}>Avg</span> {avgSnapStr}
      <span className="text-muted-foreground/60" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={stkGroupSnapLabelClass}>Mkt</span> {mktSnapStr}
    </span>
  )
}