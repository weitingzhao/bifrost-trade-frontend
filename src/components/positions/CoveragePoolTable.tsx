import { Fragment, type ReactNode } from 'react'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
import type { StockCoverageItem } from '@/types/positions'
import {
  type CoveragePoolSortCol,
  coverageRowMarketValueTotal,
  groupCoverageByAccount,
  fmtHeldSharesWhole,
} from '@/utils/coveragePool'
import './coverageSummaryLegacy.css'

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

  const accountCellClass = (accountId: string) => {
    const a = (accountId ?? '').trim()
    if (secondaryAccountId && a === secondaryAccountId) return 'coverage-account-id coverage-account-secondary'
    if (hostAccountId && a === hostAccountId) return 'coverage-account-id coverage-account-host'
    return 'coverage-account-id coverage-account-other'
  }

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
    if (!poolSortOn || !poolSort) return <th title={title}>{label}</th>
    const active = poolSort.column === col
    return (
      <th
        className="coverage-pool-sort-th"
        title={title}
        role="button"
        tabIndex={0}
        aria-sort={active ? (poolSort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        onClick={() => poolSort.onColumnClick(col)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            poolSort.onColumnClick(col)
          }
        }}
      >
        {label}
        {active ? (poolSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    )
  }

  const renderRow = (ci: StockCoverageItem, rowKey: string) => {
    const acc = ci.account_id || '—'
    return (
      <tr key={rowKey}>
        <td>
          {onInspectSymbol ? (
            <button
              type="button"
              className="coverage-pool-symbol-btn"
              onClick={() => onInspectSymbol(ci)}
              aria-label={`Stock details for ${ci.symbol} in account ${acc}`}
            >
              <strong>{ci.symbol}</strong>
            </button>
          ) : (
            <strong>{ci.symbol}</strong>
          )}
        </td>
        {!poolGroupByAccount && <td className="replay-muted">{acc}</td>}
        {showHeldColumn && (
          <td className={slim ? 'coverage-held-shares-cell' : undefined}>
            {slim ? fmtHeldSharesWhole(ci.held_shares) : ci.held_shares}
          </td>
        )}
        {showHeldAmtColumn &&
          (slim || backingLayout ? (
            <td
              className={`coverage-available-held-amt-cell${slim && !backingLayout ? ' coverage-held-amt-underlying-narrow' : ''}`}
            >
              <span
                className={`coverage-available-contracts-only${slim && !backingLayout ? ' coverage-held-amt-underlying-contracts' : ''}`}
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
                <span className="coverage-shared-hint"> ({ci.instances_needing} strat.)</span>
              )}
            </td>
          ) : null)}
        {slim || backingLayout ? (
          <td className="coverage-cost-avg-cell" title="Cost basis (total) / avg cost per share">
            <div className="coverage-cost-avg-basis">{fmtUsd(ci.cost_basis_total)}</div>
            <div className="coverage-cost-avg-per-share">{fmtUsd(ci.avg_cost_per_share)}</div>
          </td>
        ) : null}
        {slim || backingLayout ? (
          <td className="coverage-mkt-value-price-cell" title="Market value / price per share">
            <div className="coverage-mkt-value-total">{fmtUsd(coverageRowMarketValueTotal(ci))}</div>
            <div className="coverage-mkt-value-per-share">{fmtUsd(ci.live_last_price)}</div>
          </td>
        ) : null}
        {slim || backingLayout ? (
          <td className="coverage-pnl-stacked-cell">
            <div className={(ci.daily_pnl ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}>
              {fmtUsd(ci.daily_pnl)}
            </div>
            <div
              className={`coverage-pnl-stacked-pct ${(ci.daily_pct ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
            >
              {fmtSignedPct(ci.daily_pct)}
            </div>
          </td>
        ) : null}
        {slim || backingLayout ? (
          <td className="coverage-pnl-stacked-cell">
            <div className={(ci.total_pnl ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}>
              {fmtUsd(ci.total_pnl)}
            </div>
            <div
              className={`coverage-pnl-stacked-pct ${(ci.total_pct ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}`}
            >
              {fmtSignedPct(ci.total_pct)}
            </div>
          </td>
        ) : null}
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className={`coverage-summary-table${poolSortOn ? ' coverage-underlying-pool-sortable' : ''}`}
      >
        <thead>
          <tr>
            {slim || backingLayout ? sortTh('Symbol', 'symbol') : <th>Symbol</th>}
            {!poolGroupByAccount && <th>Account</th>}
            {showHeldColumn &&
              (slim ? sortTh('Held', 'held', 'Long share qty (whole shares).') : <th>Held</th>)}
            {showHeldAmtColumn &&
              (backingLayout ? (
                sortTh(
                  <span className="coverage-pool-th-backed-amt">
                    Backed
                    <br />
                    Amt
                  </span>,
                  'backed_amt',
                  'Contracts backing watchlist hedge: min(held, required) ÷ 100.',
                )
              ) : slim && poolSortOn ? (
                sortTh(
                  <span className="coverage-pool-th-held-amt">
                    Held
                    <br />
                    Amt
                  </span>,
                  'held_amt',
                  'Contracts ≈ max(0, long shares) ÷ 100.',
                )
              ) : (
                <th title="Contracts ≈ max(0, long shares) ÷ 100.">
                  <span className="coverage-pool-th-held-amt">
                    Held
                    <br />
                    Amt
                  </span>
                </th>
              ))}
            {slim || backingLayout
              ? sortTh('Basis / Avg', 'cost_basis', 'Total cost basis / avg per share.')
              : null}
            {backingLayout
              ? sortTh('Mkt / Price', 'market_price', 'Market value / share price.')
              : slim
                ? sortTh('Mkt value / Price', 'market_price', 'Market value / share price.')
                : null}
            {slim || backingLayout ? <th>Daily</th> : null}
            {slim || backingLayout ? <th>Total</th> : null}
          </tr>
        </thead>
        <tbody>
          {accountGroups
            ? accountGroups.map(({ accountId, items }) => (
                <Fragment key={`${keyPrefix}-acc-${accountId}`}>
                  <tr className="coverage-pool-account-group-row">
                    <td
                      colSpan={accountGroupColSpan}
                      className={accountCellClass(accountId)}
                      title="Host vs Secondary account IDs from monitor config."
                    >
                      {accountId}
                    </td>
                  </tr>
                  {items.map((ci) =>
                    renderRow(ci, `${keyPrefix}-${accountId}-${ci.symbol}`),
                  )}
                </Fragment>
              ))
            : rows.map((ci) =>
                renderRow(ci, `${keyPrefix}-${ci.symbol}-${ci.account_id || '—'}`),
              )}
        </tbody>
      </table>
    </div>
  )
}
