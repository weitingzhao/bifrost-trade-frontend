import { useState } from 'react'
import { Link } from 'react-router-dom'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, fmtTradeDate, fmtTs, fmtUsd, fmtUsdRound, getContractLabelParts } from '@/lib/format'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  adjustedRealizedPnlForOptGroup,
  executionStrategyInstanceIds,
  findOppositeLegAttributionSource,
  getInstanceConsistencyState,
  getOptGroupKey,
  ledgerOptDetailRowPnl,
} from '@/utils/ledger/ledgerOptHelpers'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerOptActionButtons, sideLabel } from './LedgerOptActionButtons'
import { LedgerStgInsCell } from './LedgerStgInsCell'
import type { OptGroupCallbacks, OptSortCol } from './ledgerTypes'
import styles from './TradeLedgerPage.module.css'

const CLOSED_PAGE_SIZE = 50

function PaginationBar({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className={styles.paginationBar} role="navigation" aria-label="Table pagination">
      <button type="button" className={styles.paginationBtn} onClick={() => onPage(1)} disabled={page === 1} aria-label="First page">«</button>
      <button type="button" className={styles.paginationBtn} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page">‹</button>
      <span className={styles.paginationInfo}>
        {page} / {totalPages}
        <span className={styles.paginationTotal}> ({total})</span>
      </span>
      <button type="button" className={styles.paginationBtn} onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Next page">›</button>
      <button type="button" className={styles.paginationBtn} onClick={() => onPage(totalPages)} disabled={page === totalPages} aria-label="Last page">»</button>
    </div>
  )
}

function InstanceIcon({
  state,
  instanceId,
}: {
  state: ReturnType<typeof getInstanceConsistencyState>
  instanceId: number | null
}) {
  if (state === 'none') return null
  const icon = (
    <svg viewBox="0 0 24 24" width={14} height={14} className={styles.instanceIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  )
  const cls =
    state === 'same'
      ? styles.instanceIconSame
      : state === 'multiple'
        ? styles.instanceIconMultiple
        : styles.instanceIconMixed

  if (state === 'same' && instanceId != null) {
    return (
      <Link
        to={`/strategy/instances/${instanceId}`}
        className={`${styles.instanceIconLink} ${cls}`}
        title="All fills share one strategy instance (click to open)"
        aria-label="View strategy instance"
        onClick={e => e.stopPropagation()}
      >
        {icon}
      </Link>
    )
  }

  const title =
    state === 'same'
      ? 'All fills share one strategy instance'
      : state === 'multiple'
        ? 'All fills have an instance; more than one distinct instance ID in this group'
        : 'At least one fill has no strategy instance in this group'

  return (
    <span className={`${styles.instanceIconLink} ${cls}`} title={title} role="img" onClick={e => e.stopPropagation()}>
      {icon}
    </span>
  )
}

type Props = {
  sortedClosedGroups: OptExecutionGroup[]
  closedExpandedGroups: OptExecutionGroup[]
  closedPnlSum: number
  detailsTotalPnl: number
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  optSort: { col: OptSortCol; dir: 'asc' | 'desc' }
  toggleOptSort: (col: OptSortCol) => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
} & OptGroupCallbacks

export function LedgerClosedOptionSection({
  sortedClosedGroups,
  closedExpandedGroups,
  closedPnlSum,
  detailsTotalPnl,
  expandedDetailKeys,
  toggleDetailExpand,
  optSort,
  toggleOptSort,
  linkByOptionId,
  onEdit,
  onDelete,
  onLinkStrategy,
  onSyncOpposite,
  syncingId,
}: Props) {
  const [closedPage, setClosedPage] = useState(1)

  const totalClosedPages = Math.max(1, Math.ceil(sortedClosedGroups.length / CLOSED_PAGE_SIZE))
  const effectivePage = Math.min(closedPage, totalClosedPages)
  const pagedClosedGroups = sortedClosedGroups.slice(
    (effectivePage - 1) * CLOSED_PAGE_SIZE,
    effectivePage * CLOSED_PAGE_SIZE,
  )

  if (sortedClosedGroups.length === 0) {
    return (
      <p className={styles.optEmptyHint}>No closed option groups for this period.</p>
    )
  }

  const sortMark = (col: OptSortCol) =>
    optSort.col === col ? (optSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <section aria-label="Closed option positions and details">
      <div className={styles.optTableWrap}>
        <table className={styles.optTable}>
          <thead>
            <tr>
              <th rowSpan={2} className={styles.optExpandCol} />
              <th rowSpan={2}>Contract</th>
              <th
                rowSpan={2}
                className={styles.optThSortable}
                onClick={e => { e.stopPropagation(); toggleOptSort('expiry') }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOptSort('expiry') }
                }}
                title="Sort by Expiry"
              >
                Expiry{sortMark('expiry')}
              </th>
              <th rowSpan={2}>STRIKE</th>
              <th colSpan={3}>BUY</th>
              <th colSpan={3}>SELL</th>
              <th rowSpan={2}>Realized PnL</th>
              <th rowSpan={2}>Account</th>
              <th
                rowSpan={2}
                className={styles.optThSortable}
                onClick={e => { e.stopPropagation(); toggleOptSort('trade_date') }}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOptSort('trade_date') }
                }}
                title="Sort by Trade date"
              >
                Trade date{sortMark('trade_date')}
              </th>
            </tr>
            <tr>
              <th className={styles.optThSub}>Size</th>
              <th className={styles.optThSub}>@</th>
              <th className={styles.optThSub}>Cost</th>
              <th className={styles.optThSub}>Size</th>
              <th className={styles.optThSub}>@</th>
              <th className={styles.optThSub}>Premium</th>
            </tr>
          </thead>
          <tbody>
            {pagedClosedGroups.map(g => {
              const displayGroupPnl = adjustedRealizedPnlForOptGroup(g, linkByOptionId)
              const uniqueAccounts = Array.from(
                new Set((g.trades ?? []).map(t => (t.account_id ?? '').trim()).filter(Boolean)),
              )
              const accountLabel =
                uniqueAccounts.length === 0
                  ? '—'
                  : uniqueAccounts.length === 1
                    ? uniqueAccounts[0]
                    : 'Mix'
              const groupKey = getOptGroupKey(g)
              const isExpanded = expandedDetailKeys.includes(groupKey)
              const trades = g.trades ?? []
              const resolvedState = getInstanceConsistencyState(trades)
              const singleInstanceId =
                resolvedState === 'same'
                  ? trades.find(t => t.strategy_instance_id != null && Number.isFinite(t.strategy_instance_id))
                      ?.strategy_instance_id ?? null
                  : null
              const p = getContractLabelParts(g.contract_key ?? '')
              const strikeStr = g.strike != null ? ` ${g.strike}` : ''

              return (
                <tr
                  key={groupKey}
                  className={styles.optGroupRow}
                  onClick={() => toggleDetailExpand(groupKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetailExpand(groupKey) }
                  }}
                  aria-expanded={isExpanded}
                >
                  <td className={styles.optExpandCol}>
                    <span className={`${styles.optExpandIcon} ${isExpanded ? styles.optExpandIconOpen : ''}`} aria-hidden>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </td>
                  <td className={styles.optContract}>
                    <InstanceIcon state={resolvedState} instanceId={singleInstanceId} />
                    {p.symbol ? (
                      <>
                        <strong>{p.symbol}</strong> {p.rightLabel}
                        {strikeStr}
                      </>
                    ) : (
                      g.contract_key
                    )}
                  </td>
                  <td>{fmtExpiry(g.expiry)}</td>
                  <td><strong>{fmtUsd(g.strike)}</strong></td>
                  <td>{g.buy_volume}</td>
                  <td>{fmtUsd(g.buy_avg_price)}</td>
                  <td><span className={styles.optCost}>{fmtUsd(g.buy_cost)}</span></td>
                  <td>{g.sell_volume}</td>
                  <td>{fmtUsd(g.sell_avg_price)}</td>
                  <td><span className={styles.optPremium}>{fmtUsd(g.sell_premium)}</span></td>
                  <td>
                    <span className={displayGroupPnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                      {fmtUsdRound(displayGroupPnl)}
                    </span>
                  </td>
                  <td>{accountLabel}</td>
                  <td>
                    {(() => {
                      const dates = trades
                        .map(t => t.trade_date)
                        .filter((d): d is string => d != null && String(d).trim() !== '')
                      if (dates.length === 0) return '—'
                      dates.sort()
                      return fmtTradeDate(dates[0])
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className={styles.optSummaryRow}>
              <td colSpan={10}>Total</td>
              <td>
                <strong className={closedPnlSum >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                  {fmtUsdRound(closedPnlSum)}
                </strong>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
        <PaginationBar
          page={effectivePage}
          total={sortedClosedGroups.length}
          pageSize={CLOSED_PAGE_SIZE}
          onPage={p => setClosedPage(Math.max(1, Math.min(p, totalClosedPages)))}
        />
      </div>

      <h5 className={styles.optDetailTitle}>
        Details (per trade)
        <InfoTooltip text="Click a closed trade row above to load its execution details." />
      </h5>
      <table className={styles.optTable}>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Expiry</th>
            <th>STRIKE</th>
            <th>Stg/Ins</th>
            <th>Trade date</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Comm.</th>
            <th>PnL</th>
            <th>Account</th>
            <th>Source</th>
            <th className={styles.optActionsCol}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {closedExpandedGroups.length === 0 ? (
            <tr>
              <td colSpan={13} className={styles.optDetailPlaceholder}>
                Click a closed trade row above to load details
              </td>
            </tr>
          ) : (
            closedExpandedGroups.flatMap(g =>
              (g.trades ?? []).map((ex, ti) => {
                const groupTrades = g.trades ?? []
                const oppositePeer = findOppositeLegAttributionSource(groupTrades, ex)
                const showSync =
                  onSyncOpposite &&
                  ex.account_executions_id != null &&
                  (ex.strategy_instance_id == null || !Number.isFinite(Number(ex.strategy_instance_id))) &&
                  oppositePeer != null
                const { displayPnl, hasCombinedStock } = ledgerOptDetailRowPnl(ex, linkByOptionId)
                const pnlCls =
                  displayPnl < 0 ? styles.pnlNegative : displayPnl > 0 ? styles.pnlPositive : styles.pnlZero
                const p_ = getContractLabelParts(g.contract_key ?? '')
                const strikeStr_ = g.strike != null ? ` ${g.strike}` : ''
                const instanceId = ex.strategy_instance_id

                return (
                  <tr key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}>
                    <td className={styles.optContract}>
                      {instanceId != null && (
                        <Link
                          to={`/strategy/instances/${instanceId}`}
                          className={styles.instanceIconLink}
                          title={`View instance #${instanceId}`}
                        >
                          <svg viewBox="0 0 24 24" width={14} height={14} className={styles.instanceIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="5" y="5" width="14" height="14" rx="1" />
                          </svg>
                        </Link>
                      )}
                      {p_.symbol ? (
                        <>
                          <strong>{p_.symbol}</strong> {p_.rightLabel}
                          {strikeStr_}
                          {ex.account_executions_id != null && (
                            <span className={styles.contractExecId}>#{ex.account_executions_id}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {g.contract_key}
                          {ex.account_executions_id != null && (
                            <span className={styles.contractExecId}>#{ex.account_executions_id}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td>{fmtExpiry(ex.expiry ?? g.expiry)}</td>
                    <td><strong>{fmtUsd(g.strike)}</strong></td>
                    <td><LedgerStgInsCell ex={ex} /></td>
                    <td
                      title={[
                        ex.time != null ? `Exec time: ${fmtTs(ex.time)}` : null,
                        ex.report_date ? `Report date: ${fmtTradeDate(ex.report_date)}` : null,
                      ].filter(Boolean).join(' | ')}
                    >
                      {fmtTradeDate(ex.trade_date)}
                    </td>
                    <td>{sideLabel(ex)}</td>
                    <td>{ex.quantity != null ? Number(ex.quantity) : '—'}</td>
                    <td>{fmtUsd(ex.price)}</td>
                    <td>{fmtUsd(ex.commission ?? 0)}</td>
                    <td title={hasCombinedStock ? 'Option premium cash flow for this fill plus linked stock slippage (vs Flex close)' : undefined}>
                      <span className={pnlCls}>{fmtUsd(displayPnl)}</span>
                    </td>
                    <td>{ex.account_id ?? '—'}</td>
                    <td><ExecSourceBadge source={ex.source} /></td>
                    <td className={styles.optActionsCol}>
                      {ex.account_executions_id != null ? (
                        <LedgerOptActionButtons
                          onEdit={onEdit ? () => onEdit(ex) : undefined}
                          onLink={onLinkStrategy ? () => onLinkStrategy(ex) : undefined}
                          onDelete={onDelete ? () => onDelete(ex) : undefined}
                          onSync={
                            showSync && oppositePeer && onSyncOpposite
                              ? () =>
                                  onSyncOpposite(ex, {
                                    opportunity_id: oppositePeer.strategy_opportunity_id!,
                                    instance_id: executionStrategyInstanceIds(oppositePeer)[0],
                                  })
                              : undefined
                          }
                          syncDisabled={syncingId === ex.account_executions_id}
                          syncSpinning={syncingId === ex.account_executions_id}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              }),
            )
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={9} className={styles.optDetailTotalLabel}>Total PNL</td>
            <td className={detailsTotalPnl < 0 ? styles.pnlNegative : detailsTotalPnl > 0 ? styles.pnlPositive : styles.pnlZero}>
              <strong>{fmtUsd(detailsTotalPnl)}</strong>
            </td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
