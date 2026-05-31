import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtPctCompact, fmtTradeDate, fmtTs, fmtUsd, fmtUsdRound } from '@/lib/format'
import type { Execution } from '@/types/positions'
import {
  stkCostBasisFromSnapshot,
  stkNotionalAbsUsd,
  stkNotionalTone,
  stkPctOf,
} from '@/utils/ledger/stkDisplay'
import styles from './TradeLedgerPage.module.css'

export function ledgerStkPnlClass(v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) < 0.005) return styles.pnlZero
  return v > 0 ? styles.pnlPositive : styles.pnlNegative
}

export function LedgerStkNotionalCell({ ex }: { ex: Execution }) {
  const n = stkNotionalAbsUsd(ex)
  const tone = stkNotionalTone(ex)
  return (
    <td className={styles.stkNotionalTd}>
      <span
        className={
          tone === 'buy'
            ? styles.pnlPositive
            : tone === 'sell'
              ? styles.pnlNegative
              : styles.pnlZero
        }
      >
        {n != null ? fmtUsd(n) : '—'}
      </span>
    </td>
  )
}

export function LedgerStkRowRealizedCell({ realized }: { realized: number }) {
  const isZero = !Number.isFinite(realized) || Math.abs(realized) < 0.005
  return (
    <td className={styles.stkRealizedTd}>
      {isZero ? (
        <span className={`${styles.stkRealizedValue} ${styles.pnlZero}`}>—</span>
      ) : (
        <span className={`${styles.stkRealizedValue} ${ledgerStkPnlClass(realized)}`}>
          {fmtUsdRound(realized)}
        </span>
      )}
    </td>
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
    <span className={`${styles.stkGroupTotalPnl} ${styles.stkUrPnlGroupInline}`}>
      <span className={styles.stkGroupTotalPnlLabel}>Group U/R PnL</span>
      <span className={styles.stkUrPnlGroupMetrics}>
        <span className={`${styles.stkUrPnlSeg} ${ledgerStkPnlClass(realized)}`}>
          <span className={styles.stkUrPnlPrefix}>R</span> {fmtUsdRound(realized)}
        </span>
        <span className={styles.stkUrPnlMetricSep} aria-hidden>
          ·
        </span>
        <span
          className={`${styles.stkUrPnlSeg} ${
            uFinite ? styles.stkUrUnrealized : styles.pnlZero
          }`}
        >
          <span className={styles.stkUrPnlPrefix}>U</span>{' '}
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
    <th
      className={styles.stkThSortable}
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
    </th>
  )
}

export function LedgerStkTimeCells({ ex }: { ex: Execution }) {
  return (
    <>
      <td>{ex.time != null ? fmtTs(ex.time) : '—'}</td>
      <td>{fmtTradeDate(ex.trade_date)}</td>
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
      className={styles.stkGroupBasisPct}
      title="Cost basis = |position| × avg cost (from GET /status). R% and U% are realized and unrealized PnL as a percentage of that basis (not annualized)."
    >
      <span className={styles.stkGroupSnapLabel}>Basis</span> {costBaseStr}
      <span className={styles.stkGroupSnapSep} aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={styles.stkGroupSnapLabel}>R%</span>{' '}
      <span className={rPct != null ? ledgerStkPnlClass(rPct) : styles.pnlZero}>{rPctStr}</span>
      <span className={styles.stkGroupSnapSep} aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={styles.stkGroupSnapLabel}>U%</span>{' '}
      <span className={uPct != null ? ledgerStkPnlClass(uPct) : styles.pnlZero}>{uPctStr}</span>
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
      className={styles.stkGroupPositionSnap}
      title="Current position snapshot from GET /status (portfolio positions); same source as U."
    >
      <span className={styles.stkGroupSnapLabel}>Pos</span> {posSnapStr}
      <span className={styles.stkGroupSnapSep} aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={styles.stkGroupSnapLabel}>Avg</span> {avgSnapStr}
      <span className={styles.stkGroupSnapSep} aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span className={styles.stkGroupSnapLabel}>Mkt</span> {mktSnapStr}
    </span>
  )
}
