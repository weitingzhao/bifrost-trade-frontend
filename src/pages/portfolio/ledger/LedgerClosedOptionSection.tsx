import { useState } from 'react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, fmtTradeDate, fmtTs, fmtUsd, fmtUsdRound } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  adjustedRealizedPnlForOptGroup,
  executionStrategyInstanceIds,
  findOppositeLegAttributionSource,
  getOptGroupKey,
  ledgerOptDetailRowPnl,
} from '@/utils/ledger/ledgerOptHelpers'
import { LedgerOptContractCell } from './LedgerOptContractCell'
import {
  ClosedOptColgroup,
  closedOptContractCell,
  closedOptContractHead,
  closedOptDetailActionsCell,
  closedOptDetailActionsHead,
  closedOptDetailContractCell,
  closedOptDetailTableClass,
  ClosedOptDetailColgroup,
  closedOptExpandCell,
  closedOptHeadPrimary,
  closedOptHeadSub,
  closedOptNumCell,
  closedOptTableClass,
} from './ledgerClosedOptionUi'
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
} from '@/components/data-display'

const CLOSED_PAGE_SIZE = 50

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
  onLinkStock,
  onSyncOpposite,
  onViewLinks,
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
    className: cn(denseTable.sortableHead, closedOptHeadPrimary),
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
      <DenseDataTable wrapClassName="mb-0 rounded-b-none" tableClassName={closedOptTableClass}>
        <ClosedOptColgroup />
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead rowSpan={2} className={cn(closedOptExpandCell, closedOptHeadPrimary)} aria-hidden />
            <DenseTableHead rowSpan={2} className={closedOptContractHead}>
              Contract
            </DenseTableHead>
            <DenseTableHead rowSpan={2} {...sortHeadProps('expiry', 'Sort by Expiry')}>
              Expiry{sortMark('expiry')}
            </DenseTableHead>
            <DenseTableHead rowSpan={2} className={closedOptHeadPrimary}>
              STRIKE
            </DenseTableHead>
            <DenseTableHead colSpan={3} className={closedOptHeadPrimary}>
              BUY
            </DenseTableHead>
            <DenseTableHead colSpan={3} className={closedOptHeadPrimary}>
              SELL
            </DenseTableHead>
            <DenseTableHead rowSpan={2} className={closedOptHeadPrimary}>
              Realized PnL
            </DenseTableHead>
            <DenseTableHead rowSpan={2} className={closedOptHeadPrimary}>
              Account
            </DenseTableHead>
            <DenseTableHead rowSpan={2} {...sortHeadProps('trade_date', 'Sort by Trade date')}>
              Trade date{sortMark('trade_date')}
            </DenseTableHead>
          </DenseTableHeadRow>
          <DenseTableHeadRow>
            <DenseTableHead className={closedOptHeadSub}>Size</DenseTableHead>
            <DenseTableHead className={closedOptHeadSub}>@</DenseTableHead>
            <DenseTableHead className={closedOptHeadSub}>Cost</DenseTableHead>
            <DenseTableHead className={closedOptHeadSub}>Size</DenseTableHead>
            <DenseTableHead className={closedOptHeadSub}>@</DenseTableHead>
            <DenseTableHead className={closedOptHeadSub}>Premium</DenseTableHead>
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
                <DenseTableCell className={closedOptExpandCell}>
                  <ExpandToggleCell
                    expanded={isExpanded}
                    onToggle={() => toggleDetailExpand(groupKey)}
                    label="Expand closed group details"
                  />
                </DenseTableCell>
                <DenseTableCell className={closedOptContractCell}>
                  <LedgerOptContractCell
                    group={g}
                    linkByOptionId={linkByOptionId}
                    onViewLinks={onViewLinks}
                    prominent
                  />
                </DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{fmtExpiry(g.expiry)}</DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>
                  <strong>{fmtUsd(g.strike)}</strong>
                </DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{g.buy_volume}</DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{fmtUsd(g.buy_avg_price)}</DenseTableCell>
                <DenseTableCell className={cn(closedOptNumCell, 'font-bold text-destructive')}>
                  {fmtUsd(g.buy_cost)}
                </DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{g.sell_volume}</DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{fmtUsd(g.sell_avg_price)}</DenseTableCell>
                <DenseTableCell className={cn(closedOptNumCell, 'font-bold text-success')}>
                  {fmtUsd(g.sell_premium)}
                </DenseTableCell>
                <DenseTableCell className={cn(closedOptNumCell, pnlColorClass(displayGroupPnl))}>
                  {fmtUsdRound(displayGroupPnl)}
                </DenseTableCell>
                <DenseTableCell className={closedOptNumCell}>{accountLabel}</DenseTableCell>
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
            <DenseTableCell colSpan={10} className="text-left text-muted-foreground">
              Total
            </DenseTableCell>
            <DenseTableCell className={cn(closedOptNumCell, pnlColorClass(closedPnlSum))}>
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

      <h5 className="mb-2 mt-4 inline-flex items-center gap-1.5 text-dense-body font-semibold text-foreground">
        Details (per trade)
        <InfoTooltip text="Click a closed trade row above to load its execution details." />
      </h5>
      <DenseDataTable wrapClassName={denseTable.scrollX} tableClassName={closedOptDetailTableClass}>
        <ClosedOptDetailColgroup />
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className={closedOptContractHead}>Contract</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Expiry</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>STRIKE</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Stg/Ins</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Trade date</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Side</DenseTableHead>
            <DenseTableHead className={closedOptNumCell}>Qty</DenseTableHead>
            <DenseTableHead className={closedOptNumCell}>Price</DenseTableHead>
            <DenseTableHead className={closedOptNumCell}>Comm.</DenseTableHead>
            <DenseTableHead className={closedOptNumCell}>PnL</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Account</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Source</DenseTableHead>
            <DenseTableHead className={closedOptDetailActionsHead}>Actions</DenseTableHead>
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

                return (
                  <DenseTableRow key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}>
                    <DenseTableCell className={closedOptDetailContractCell}>
                      <LedgerOptContractCell
                        group={g}
                        linkByOptionId={linkByOptionId}
                        onViewLinks={onViewLinks}
                        showExecId={ex.account_executions_id}
                        prominent
                      />
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
                    <DenseTableCell className={closedOptNumCell}>
                      {ex.quantity != null ? Number(ex.quantity) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>{fmtUsd(ex.price)}</DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>
                      {fmtUsd(ex.commission ?? 0)}
                    </DenseTableCell>
                    <DenseTableCell
                      className={cn(closedOptNumCell, pnlColorClass(displayPnl))}
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
                    <DenseTableCell className={closedOptDetailActionsCell}>
                      {ex.account_executions_id != null ? (
                        <LedgerOptActionButtons
                          onEdit={onEdit ? () => onEdit(ex) : undefined}
                          onLink={
                            onLinkStrategy
                              ? () => onLinkStrategy(ex, g.trades ?? [])
                              : undefined
                          }
                          onLinkStock={onLinkStock ? () => onLinkStock(ex) : undefined}
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
            <DenseTableCell colSpan={9} className="text-left text-muted-foreground">
              Total PNL
            </DenseTableCell>
            <DenseTableCell className={cn(closedOptNumCell, pnlColorClass(detailsTotalPnl))}>
              <strong>{fmtUsd(detailsTotalPnl)}</strong>
            </DenseTableCell>
            <DenseTableCell colSpan={3} />
          </DenseTableRow>
        </tfoot>
      </DenseDataTable>
    </section>
  )
}
