import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, fmtTradeDate, fmtTs, fmtUsd, fmtUsdRound, getContractLabelParts } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
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
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { sideLabel } from './ledgerOptSideLabel'
import { LedgerStgInsCell } from './LedgerStgInsCell'
import { LedgerPaginationBar } from './LedgerPaginationBar'
import type { OptGroupCallbacks, OptSortCol } from './ledgerTypes'
import {
  denseTable,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  denseTableNumCell,
} from '@/components/data-display'

const CLOSED_PAGE_SIZE = 50

const INSTANCE_ICON_CLASS: Record<string, string> = {
  same: 'text-emerald-500',
  multiple: 'text-amber-400',
  mixed: 'text-slate-400',
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
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
  )
  const cls = INSTANCE_ICON_CLASS[state] ?? 'text-slate-400'
  const linkClass = cn('mr-1.5 inline-flex items-center', cls)

  if (state === 'same' && instanceId != null) {
    return (
      <Link
        to={`/strategy/instances/${instanceId}`}
        className={linkClass}
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
    <span className={linkClass} title={title} role="img" onClick={e => e.stopPropagation()}>
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
    return <p className={denseTable.emptyHint}>No closed option groups for this period.</p>
  }

  const sortMark = (col: OptSortCol) =>
    optSort.col === col ? (optSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const sortHeadProps = (col: OptSortCol, title: string) => ({
    className: denseTable.sortableHead,
    role: 'button' as const,
    tabIndex: 0,
    title,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleOptSort(col)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleOptSort(col)
      }
    },
  })

  return (
    <section aria-label="Closed option positions and details">
      <DenseDataTable wrapClassName="mb-0 rounded-b-none">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead rowSpan={2} className="w-8" aria-hidden />
            <DenseTableHead rowSpan={2}>Contract</DenseTableHead>
            <DenseTableHead rowSpan={2} {...sortHeadProps('expiry', 'Sort by Expiry')}>
              Expiry{sortMark('expiry')}
            </DenseTableHead>
            <DenseTableHead rowSpan={2}>STRIKE</DenseTableHead>
            <DenseTableHead colSpan={3}>BUY</DenseTableHead>
            <DenseTableHead colSpan={3}>SELL</DenseTableHead>
            <DenseTableHead rowSpan={2}>Realized PnL</DenseTableHead>
            <DenseTableHead rowSpan={2}>Account</DenseTableHead>
            <DenseTableHead rowSpan={2} {...sortHeadProps('trade_date', 'Sort by Trade date')}>
              Trade date{sortMark('trade_date')}
            </DenseTableHead>
          </DenseTableHeadRow>
          <DenseTableHeadRow>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              Size
            </DenseTableHead>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              @
            </DenseTableHead>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              Cost
            </DenseTableHead>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              Size
            </DenseTableHead>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              @
            </DenseTableHead>
            <DenseTableHead className="font-medium normal-case tracking-normal text-muted-foreground">
              Premium
            </DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
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
                ? (trades.find(
                    t => t.strategy_instance_id != null && Number.isFinite(t.strategy_instance_id),
                  )?.strategy_instance_id ?? null)
                : null
            const p = getContractLabelParts(g.contract_key ?? '')
            const strikeStr = g.strike != null ? ` ${g.strike}` : ''

            return (
              <DenseTableRow
                key={groupKey}
                className="cursor-pointer"
                onClick={() => toggleDetailExpand(groupKey)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleDetailExpand(groupKey)
                  }
                }}
                aria-expanded={isExpanded}
              >
                <DenseTableCell className="w-8 p-0">
                  <ExpandToggleCell
                    expanded={isExpanded}
                    onToggle={() => toggleDetailExpand(groupKey)}
                    label="Expand closed group details"
                  />
                </DenseTableCell>
                <DenseTableCell className="font-mono text-[length:var(--text-dense-meta)] whitespace-nowrap">
                  <InstanceIcon state={resolvedState} instanceId={singleInstanceId} />
                  {p.symbol ? (
                    <>
                      <strong>{p.symbol}</strong> {p.rightLabel}
                      {strikeStr}
                    </>
                  ) : (
                    g.contract_key
                  )}
                </DenseTableCell>
                <DenseTableCell>{fmtExpiry(g.expiry)}</DenseTableCell>
                <DenseTableCell>
                  <strong>{fmtUsd(g.strike)}</strong>
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{g.buy_volume}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(g.buy_avg_price)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'font-bold text-destructive')}>
                  {fmtUsd(g.buy_cost)}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{g.sell_volume}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(g.sell_avg_price)}</DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, 'font-bold text-success')}>
                  {fmtUsd(g.sell_premium)}
                </DenseTableCell>
                <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(displayGroupPnl))}>
                  {fmtUsdRound(displayGroupPnl)}
                </DenseTableCell>
                <DenseTableCell>{accountLabel}</DenseTableCell>
                <DenseTableCell>
                  {(() => {
                    const dates = trades
                      .map(t => t.trade_date)
                      .filter((d): d is string => d != null && String(d).trim() !== '')
                    if (dates.length === 0) return '—'
                    dates.sort()
                    return fmtTradeDate(dates[0])
                  })()}
                </DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
        <tfoot>
          <DenseTableRow className="font-semibold hover:bg-transparent border-t-2 border-border">
            <DenseTableCell colSpan={10}>Total</DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(closedPnlSum))}>
              <strong>{fmtUsdRound(closedPnlSum)}</strong>
            </DenseTableCell>
            <DenseTableCell colSpan={2} />
          </DenseTableRow>
        </tfoot>
      </DenseDataTable>
      <LedgerPaginationBar
        page={effectivePage}
        total={sortedClosedGroups.length}
        pageSize={CLOSED_PAGE_SIZE}
        onPage={p => setClosedPage(Math.max(1, Math.min(p, totalClosedPages)))}
      />

      <h5 className="mb-2 mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-foreground">
        Details (per trade)
        <InfoTooltip text="Click a closed trade row above to load its execution details." />
      </h5>
      <DenseDataTable>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Contract</DenseTableHead>
            <DenseTableHead>Expiry</DenseTableHead>
            <DenseTableHead>STRIKE</DenseTableHead>
            <DenseTableHead>Stg/Ins</DenseTableHead>
            <DenseTableHead>Trade date</DenseTableHead>
            <DenseTableHead>Side</DenseTableHead>
            <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
            <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
            <DenseTableHead className={denseTableNumCell}>Comm.</DenseTableHead>
            <DenseTableHead className={denseTableNumCell}>PnL</DenseTableHead>
            <DenseTableHead>Account</DenseTableHead>
            <DenseTableHead>Source</DenseTableHead>
            <DenseTableHead className={`${denseTableNumCell} w-24`}>Actions</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {closedExpandedGroups.length === 0 ? (
            <DenseTableRow className="hover:bg-transparent">
              <DenseTableCell
                colSpan={13}
                className="py-4 text-center italic text-muted-foreground"
              >
                Click a closed trade row above to load details
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            closedExpandedGroups.flatMap(g =>
              (g.trades ?? []).map((ex, ti) => {
                const groupTrades = g.trades ?? []
                const oppositePeer = findOppositeLegAttributionSource(groupTrades, ex)
                const showSync =
                  onSyncOpposite &&
                  ex.account_executions_id != null &&
                  (ex.strategy_instance_id == null ||
                    !Number.isFinite(Number(ex.strategy_instance_id))) &&
                  oppositePeer != null
                const { displayPnl, hasCombinedStock } = ledgerOptDetailRowPnl(ex, linkByOptionId)
                const p_ = getContractLabelParts(g.contract_key ?? '')
                const strikeStr_ = g.strike != null ? ` ${g.strike}` : ''
                const instanceId = ex.strategy_instance_id

                return (
                  <DenseTableRow key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}>
                    <DenseTableCell className="font-mono text-[length:var(--text-dense-meta)] whitespace-nowrap">
                      {instanceId != null && (
                        <Link
                          to={`/strategy/instances/${instanceId}`}
                          className="mr-1.5 inline-flex items-center text-emerald-500"
                          title={`View instance #${instanceId}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width={14}
                            height={14}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <rect x="5" y="5" width="14" height="14" rx="1" />
                          </svg>
                        </Link>
                      )}
                      {p_.symbol ? (
                        <>
                          <strong>{p_.symbol}</strong> {p_.rightLabel}
                          {strikeStr_}
                          {ex.account_executions_id != null && (
                            <span className="ml-1.5 text-[0.72em] font-medium text-muted-foreground/75">
                              #{ex.account_executions_id}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {g.contract_key}
                          {ex.account_executions_id != null && (
                            <span className="ml-1.5 text-[0.72em] font-medium text-muted-foreground/75">
                              #{ex.account_executions_id}
                            </span>
                          )}
                        </>
                      )}
                    </DenseTableCell>
                    <DenseTableCell>{fmtExpiry(ex.expiry ?? g.expiry)}</DenseTableCell>
                    <DenseTableCell>
                      <strong>{fmtUsd(g.strike)}</strong>
                    </DenseTableCell>
                    <DenseTableCell>
                      <LedgerStgInsCell ex={ex} />
                    </DenseTableCell>
                    <DenseTableCell
                      title={[
                        ex.time != null ? `Exec time: ${fmtTs(ex.time)}` : null,
                        ex.report_date ? `Report date: ${fmtTradeDate(ex.report_date)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    >
                      {fmtTradeDate(ex.trade_date)}
                    </DenseTableCell>
                    <DenseTableCell>{sideLabel(ex)}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {ex.quantity != null ? Number(ex.quantity) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{fmtUsd(ex.price)}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {fmtUsd(ex.commission ?? 0)}
                    </DenseTableCell>
                    <DenseTableCell
                      className={cn(denseTableNumCell, pnlColorClass(displayPnl))}
                      title={
                        hasCombinedStock
                          ? 'Option premium cash flow for this fill plus linked stock slippage (vs Flex close)'
                          : undefined
                      }
                    >
                      {fmtUsd(displayPnl)}
                    </DenseTableCell>
                    <DenseTableCell>{ex.account_id ?? '—'}</DenseTableCell>
                    <DenseTableCell>
                      <ExecSourceBadge source={ex.source} />
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {ex.account_executions_id != null ? (
                        <LedgerOptActionButtons
                          onEdit={onEdit ? () => onEdit(ex) : undefined}
                          onLink={
                            onLinkStrategy
                              ? () => onLinkStrategy(ex, g.trades ?? [])
                              : undefined
                          }
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
                    </DenseTableCell>
                  </DenseTableRow>
                )
              }),
            )
          )}
        </DenseTableBody>
        <tfoot>
          <DenseTableRow className="hover:bg-transparent">
            <DenseTableCell colSpan={9} className="text-right text-muted-foreground">
              Total PNL
            </DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(detailsTotalPnl))}>
              <strong>{fmtUsd(detailsTotalPnl)}</strong>
            </DenseTableCell>
            <DenseTableCell colSpan={3} />
          </DenseTableRow>
        </tfoot>
      </DenseDataTable>
    </section>
  )
}
