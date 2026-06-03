import { Fragment, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import type { StockCoverageItem } from '@/types/positions'
import {
  type CoveragePoolSortCol,
  coverageRowMarketValueTotal,
  groupCoverageByAccount,
  fmtHeldSharesWhole,
} from '@/utils/coveragePool'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GroupHeaderRow,
  PnlCell,
  SymbolLinkButton,
  denseTable,
  denseTableEntityCell,
  denseTableEntityLink,
} from '@/components/data-display'
import { coveragePanel, coverageAccountClass } from './coveragePanelClasses'

export interface CoveragePoolSortState {
  column: CoveragePoolSortCol
  dir: 'asc' | 'desc'
  onColumnClick: (col: CoveragePoolSortCol) => void
}

interface Props {
  rows: StockCoverageItem[]
  keyPrefix: string
  underlyingPoolSlim?: boolean
  backingPoolSlim?: boolean
  underlyingPoolSort?: CoveragePoolSortState
  hostAccountId?: string
  secondaryAccountId?: string
  onInspectSymbol?: (ci: StockCoverageItem) => void
}

export function CoveragePoolTable({
  rows,
  keyPrefix,
  underlyingPoolSlim = false,
  backingPoolSlim = false,
  underlyingPoolSort,
  hostAccountId = '',
  secondaryAccountId = '',
  onInspectSymbol,
}: Props) {
  const slim = underlyingPoolSlim
  const backingLayout = backingPoolSlim && !slim
  const poolSort = underlyingPoolSort
  const poolSortOn = !!(poolSort && (slim || backingLayout))
  const poolGroupByAccount = slim || backingLayout
  const accountGroupColSpan = poolGroupByAccount ? 7 : 0

  const accountCellClass = (accountId: string) =>
    coverageAccountClass(accountId, hostAccountId, secondaryAccountId)

  const accountGroups =
    poolGroupByAccount && poolSort
      ? groupCoverageByAccount(
          rows,
          poolSort.column,
          poolSort.dir,
          hostAccountId,
          secondaryAccountId,
        )
      : null

  const showHeldColumn = !backingLayout
  const showHeldAmtColumn = slim || backingLayout

  const sortTh = (label: ReactNode, col: CoveragePoolSortCol, title?: string) => {
    if (!poolSortOn || !poolSort) {
      return <DenseTableHead>{label}</DenseTableHead>
    }
    const active = poolSort.column === col
    return (
      <DenseTableHead
        className={cn(denseTable.sortableHead, active && 'text-foreground')}
        title={title}
        role="button"
        tabIndex={0}
        aria-sort={active ? (poolSort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => poolSort.onColumnClick(col)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            poolSort.onColumnClick(col)
          }
        }}
      >
        {label}
        {active ? (poolSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </DenseTableHead>
    )
  }

  const renderRow = (ci: StockCoverageItem, rowKey: string) => {
    const acc = ci.account_id || '—'
    return (
      <DenseTableRow key={rowKey}>
        <DenseTableCell className={denseTableEntityCell}>
          {onInspectSymbol ? (
            <SymbolLinkButton
              label={ci.symbol ?? '—'}
              onClick={() => onInspectSymbol(ci)}
              ariaLabel={`Stock details for ${ci.symbol} in account ${acc}`}
              variant="stock"
              className={denseTableEntityLink}
            />
          ) : (
            <strong className={denseTableEntityLink}>{ci.symbol}</strong>
          )}
        </DenseTableCell>
        {!poolGroupByAccount && (
          <DenseTableCell className="text-muted-foreground">{acc}</DenseTableCell>
        )}
        {showHeldColumn && (
          <DenseTableCell className="tabular-nums">
            {slim ? fmtHeldSharesWhole(ci.held_shares) : ci.held_shares}
          </DenseTableCell>
        )}
        {showHeldAmtColumn &&
          (slim || backingLayout ? (
            <DenseTableCell
              className={cn(
                slim && !backingLayout && coveragePanel.heldAmtNarrow,
              )}
            >
              <span
                className={coveragePanel.availableContracts}
                title={
                  backingLayout
                    ? `${Math.floor(Math.max(0, Math.min(ci.held_shares, ci.required_shares)) / 100)} contracts`
                    : `${Math.floor(Math.max(0, ci.held_shares) / 100)} contracts`
                }
              >
                {backingLayout
                  ? Math.floor(Math.max(0, Math.min(ci.held_shares || 0, ci.required_shares || 0)) / 100)
                  : Math.floor(Math.max(0, ci.held_shares) / 100)}
              </span>
              {backingLayout && ci.instances_needing > 1 && (
                <span className={coveragePanel.sharedHint}> ({ci.instances_needing} strat.)</span>
              )}
            </DenseTableCell>
          ) : null)}
        {slim || backingLayout ? (
          <DenseTableCell className={coveragePanel.costAvgCell} title="Cost basis (total) / avg cost per share">
            <div className="font-semibold">{fmtUsd(ci.cost_basis_total)}</div>
            <div className={coveragePanel.costAvgPerShare}>{fmtUsd(ci.avg_cost_per_share)}</div>
          </DenseTableCell>
        ) : null}
        {slim || backingLayout ? (
          <DenseTableCell className={coveragePanel.mktValueCell} title="Market value / price per share">
            <div className="font-semibold">{fmtUsd(coverageRowMarketValueTotal(ci))}</div>
            <div className={coveragePanel.mktValuePerShare}>{fmtUsd(ci.live_last_price)}</div>
          </DenseTableCell>
        ) : null}
        {slim || backingLayout ? (
          <DenseTableCell className="text-right">
            <PnlCell dollar={ci.daily_pnl} pct={ci.daily_pct} formatDollar={fmtUsd} formatPct={fmtSignedPct} />
          </DenseTableCell>
        ) : null}
        {slim || backingLayout ? (
          <DenseTableCell className="text-right">
            <PnlCell dollar={ci.total_pnl} pct={ci.total_pct} formatDollar={fmtUsd} formatPct={fmtSignedPct} />
          </DenseTableCell>
        ) : null}
      </DenseTableRow>
    )
  }

  return (
    <DenseDataTable wrapClassName="border-0">
      <DenseTableHeader>
        <DenseTableHeadRow>
          {slim || backingLayout ? sortTh('Symbol', 'symbol') : <DenseTableHead>Symbol</DenseTableHead>}
          {!poolGroupByAccount && <DenseTableHead>Account</DenseTableHead>}
          {showHeldColumn &&
            (slim ? sortTh('Held', 'held', 'Long share qty (whole shares).') : <DenseTableHead>Held</DenseTableHead>)}
          {showHeldAmtColumn &&
            (backingLayout ? (
              sortTh(
                <span className="inline-block text-center text-[0.78rem] leading-tight">
                  Backed
                  <br />
                  Amt
                </span>,
                'backed_amt',
                'Contracts backing watchlist hedge: min(held, required) ÷ 100.',
              )
            ) : slim && poolSortOn ? (
              sortTh(
                <span className="inline-block text-center text-[0.78rem] leading-tight">
                  Held
                  <br />
                  Amt
                </span>,
                'held_amt',
                'Contracts ≈ max(0, long shares) ÷ 100.',
              )
            ) : (
              <DenseTableHead title="Contracts ≈ max(0, long shares) ÷ 100.">
                <span className="inline-block text-center text-[0.78rem] leading-tight">
                  Held
                  <br />
                  Amt
                </span>
              </DenseTableHead>
            ))}
          {slim || backingLayout
            ? sortTh('Basis / Avg', 'cost_basis', 'Total cost basis / avg per share.')
            : null}
          {backingLayout
            ? sortTh('Mkt / Price', 'market_price', 'Market value / share price.')
            : slim
              ? sortTh('Mkt value / Price', 'market_price', 'Market value / share price.')
              : null}
          {slim || backingLayout ? <DenseTableHead>Daily</DenseTableHead> : null}
          {slim || backingLayout ? <DenseTableHead>Total</DenseTableHead> : null}
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {accountGroups
          ? accountGroups.map(({ accountId, items }) => (
              <Fragment key={`${keyPrefix}-acc-${accountId}`}>
                <GroupHeaderRow
                  colSpan={accountGroupColSpan}
                  label={
                    <span className={accountCellClass(accountId)} title="Host vs Secondary account IDs from monitor config.">
                      {accountId}
                    </span>
                  }
                />
                {items.map((ci) =>
                  renderRow(ci, `${keyPrefix}-${accountId}-${ci.symbol}`),
                )}
              </Fragment>
            ))
          : rows.map((ci) =>
              renderRow(ci, `${keyPrefix}-${ci.symbol}-${ci.account_id || '—'}`),
            )}
      </DenseTableBody>
    </DenseDataTable>
  )
}
