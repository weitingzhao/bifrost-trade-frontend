import { cn } from '@/lib/utils'
import { fmtTs, fmtUsd } from '@/lib/format'
import { fmtExpiryOccToken } from './ledgerContractMark'
import { LedgerOptContractCell } from './LedgerOptContractCell'
import { pnlColorClass } from '@/utils/dailyChange'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  getOptGroupKey,
  ledgerOptDetailRowPnl,
} from '@/utils/ledger/ledgerOptHelpers'
import { oppositeLegSyncPayload } from './ledgerOppositeLeg'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerBookingTagForFill } from './LedgerBookingTag'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { sideLabel } from './ledgerOptSideLabel'
import { LedgerStgInsCell } from './LedgerStgInsCell'
import type { OptGroupCallbacks } from './ledgerTypes'
import {
  OpenOptColgroup,
  OpenOptDetailColgroup,
  openOptContractCell,
  openOptContractHead,
  openOptExpandCell,
  openOptHeadPrimary,
  openOptMetaCell,
  openOptNumCell,
  openOptTableClass,
  openOptTradesCell,
} from './ledgerOpenOptionUi'
import {
  closedOptContractHead,
  closedOptDetailActionsCell,
  closedOptDetailActionsHead,
  closedOptDetailContractCell,
  closedOptHeadPrimary,
  closedOptNumCell,
} from './ledgerClosedOptionUi'
import {
  denseTable,
  DenseDataTable,
  DenseTag,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  IconActionButton,
} from '@/components/data-display'
import { fmtLedgerTradeDate } from './ledgerTradeDate'
import { ledgerTableMinClass } from './ledgerTableFloors'
import { expiredCloseTarget } from './ledgerJournalWrite'
import { LedgerPanelBar } from './LedgerPanelBar'
import { ledgerDetailsSubject } from './ledgerDetailsSubject'
import { ledgerShell } from './ledgerShellUi'
import { fillQtyShown } from '@/utils/fillQuantity'
import { LEDGER_PENDING_TITLE } from '@/utils/ledger/pendingFills'

function tradesSummary(g: OptExecutionGroup): string {
  return (g.trades ?? [])
    .map(ex => {
      const q = ex.quantity != null ? Math.abs(Number(ex.quantity)) : NaN
      const p = ex.price != null ? Number(ex.price) : NaN
      const idLabel = ex.account_executions_id != null ? `#${ex.account_executions_id}` : 'id?'
      const pendingMark = ex.pending ? ' pending' : ''
      const parts: string[] = [sideLabel(ex)]
      if (Number.isFinite(q)) parts.push(String(q))
      if (Number.isFinite(p)) parts.push(`@${p}`)
      parts.push(`(${idLabel}${pendingMark})`)
      return parts.join(' ')
    })
    .join('; ')
}

const PENDING_TITLE = LEDGER_PENDING_TITLE

/** The net quantity, and IB's live position beside it: a check when they agree, IB's figure when not. */
function OpenNetQty({ net, ib }: { net: number; ib: number | null | undefined }) {
  if (ib == null) return <>{net}</>
  const same = Math.abs(net - ib) < 1e-9
  return (
    <span className="inline-flex items-baseline justify-end gap-1.5">
      <span>{net}</span>
      <span
        className={cn('text-dense-meta font-normal', same ? 'text-success' : 'text-warning')}
        title={
          same
            ? "Matches IB's live position (account snapshot)"
            : `IB's live position is ${ib}: a fill is missing here, or IB has not reported it yet`
        }
      >
        {same ? '✓ IB' : `IB ${ib}`}
      </span>
    </span>
  )
}

function OpenGroupTable({
  groups,
  expandedDetailKeys,
  toggleDetailExpand,
  showExpiredClose,
  onExpiredClose,
  linkByOptionId,
  onViewLinks,
  ibNetForGroup,
}: {
  groups: OptExecutionGroup[]
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  showExpiredClose?: boolean
  onExpiredClose?: (group: OptExecutionGroup) => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
  onViewLinks?: OptGroupCallbacks['onViewLinks']
  ibNetForGroup?: (g: OptExecutionGroup) => number | null
}) {
  return (
    <DenseDataTable wrapClassName="rounded-none border-0" tableClassName={openOptTableClass}>
      <OpenOptColgroup showActions={showExpiredClose} />
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className={openOptExpandCell} aria-hidden />
          <DenseTableHead className={openOptContractHead}>Contract</DenseTableHead>
          <DenseTableHead className={openOptHeadPrimary}>Account</DenseTableHead>
          <DenseTableHead className={openOptHeadPrimary}>Expiry</DenseTableHead>
          <DenseTableHead className={cn(openOptHeadPrimary, 'text-right')}>Strike</DenseTableHead>
          <DenseTableHead className={cn(openOptHeadPrimary, 'text-right')}>Net qty</DenseTableHead>
          <DenseTableHead className={openOptHeadPrimary}>Trades (side / qty / price / id)</DenseTableHead>
          <DenseTableHead className={openOptHeadPrimary}>Source</DenseTableHead>
          {showExpiredClose && (
            <DenseTableHead className={cn(openOptNumCell, 'w-16')}>Actions</DenseTableHead>
          )}
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {groups.map(g => {
          const groupKey = getOptGroupKey(g)
          const isExpanded = expandedDetailKeys.includes(groupKey)
          const uniqueAccounts = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.account_id ?? '').trim()).filter(Boolean)),
          )
          const uniqueSources = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.source ?? '').trim()).filter(Boolean)),
          )
          const pendingCount = (g.trades ?? []).filter(ex => ex.pending).length
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
              <DenseTableCell className={openOptExpandCell}>
                <ExpandToggleCell
                  expanded={isExpanded}
                  onToggle={() => toggleDetailExpand(groupKey)}
                  label="Expand open group details"
                />
              </DenseTableCell>
              <DenseTableCell className={openOptContractCell}>
                <LedgerOptContractCell
                  group={g}
                  linkByOptionId={linkByOptionId}
                  onViewLinks={onViewLinks}
                  prominent
                />
              </DenseTableCell>
              <DenseTableCell className={cn(openOptMetaCell, 'font-mono text-muted-foreground')}>
                {uniqueAccounts.length > 0 ? uniqueAccounts.join(', ') : '—'}
              </DenseTableCell>
              <DenseTableCell className={cn(openOptMetaCell, 'font-mono text-muted-foreground')}>
                {fmtExpiryOccToken(g.expiry)}
              </DenseTableCell>
              <DenseTableCell className={openOptNumCell}>{fmtUsd(g.strike)}</DenseTableCell>
              <DenseTableCell className={cn(openOptNumCell, 'font-semibold')}>
                <OpenNetQty net={g.net_qty} ib={ibNetForGroup?.(g)} />
              </DenseTableCell>
              <DenseTableCell className={openOptTradesCell}>{tradesSummary(g) || '—'}</DenseTableCell>
              <DenseTableCell className={openOptMetaCell}>
                {uniqueSources.length > 0
                  ? uniqueSources.map(s => <ExecSourceBadge key={s} source={s} />)
                  : '—'}
                {pendingCount > 0 && (
                  <DenseTag variant="warning" size="cell" className="ml-1 whitespace-nowrap" title={PENDING_TITLE}>
                    {pendingCount} pending
                  </DenseTag>
                )}
              </DenseTableCell>
              {showExpiredClose && (
                <DenseTableCell className={openOptNumCell}>
                  <div onClick={e => e.stopPropagation()}>
                    {onExpiredClose && (() => {
                      const target = expiredCloseTarget(g)
                      return (
                        <IconActionButton
                          onClick={() => onExpiredClose(g)}
                          disabled={!target.ok}
                          title={target.ok ? 'Write expiry close' : target.reason}
                          ariaLabel="Write expiry close"
                          tone="warn"
                          size="dense"
                        >
                          ✕
                        </IconActionButton>
                      )
                    })()}
                  </div>
                </DenseTableCell>
              )}
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}

type Props = {
  openActiveGroups: OptExecutionGroup[]
  openExpiredGroups: OptExecutionGroup[]
  openExpandedGroups: OptExecutionGroup[]
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  linkByOptionId: Record<number, OptionStockLinkSummary>
  ibNetForGroup?: (g: OptExecutionGroup) => number | null
} & OptGroupCallbacks

export function LedgerOpenOptionSection({
  openActiveGroups,
  openExpiredGroups,
  openExpandedGroups,
  expandedDetailKeys,
  toggleDetailExpand,
  linkByOptionId,
  ibNetForGroup,
  onEdit,
  onDelete,
  onLinkStrategy,
  onLinkStock,
  onExpiredClose,
  onSyncOpposite,
  onViewLinks,
  syncingId,
  syncError,
  stockFills = [],
}: Props) {
  if (openActiveGroups.length === 0 && openExpiredGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No open option groups.</p>
  }

  return (
    <section aria-label="Open option positions and details" className={ledgerShell.panel}>
      {openActiveGroups.length > 0 && (
        <>
          <LedgerPanelBar
            title="Open option"
            subject={`${openActiveGroups.length} ${openActiveGroups.length === 1 ? 'contract' : 'contracts'}`}
            hint="net quantity not zero, expiry ahead · includes TWS fills not yet in Flex (pending) · not in the Summary, which counts closed contracts only"
          />
          <OpenGroupTable
            groups={openActiveGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
            linkByOptionId={linkByOptionId}
            onViewLinks={onViewLinks}
            ibNetForGroup={ibNetForGroup}
          />
        </>
      )}

      {openExpiredGroups.length > 0 && (
        <>
          <LedgerPanelBar
            title="Expired but not closed"
            subject={`${openExpiredGroups.length} ${openExpiredGroups.length === 1 ? 'contract' : 'contracts'}`}
            hint="expired with a net quantity left · a fill is missing, or write the expiry close"
          />
          <OpenGroupTable
            groups={openExpiredGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
            showExpiredClose
            onExpiredClose={onExpiredClose}
            linkByOptionId={linkByOptionId}
            onViewLinks={onViewLinks}
            ibNetForGroup={ibNetForGroup}
          />
        </>
      )}

      <LedgerPanelBar
        title="Details · per trade"
        subject={ledgerDetailsSubject(openExpandedGroups)}
        hint="the fills behind the row above"
      />
      <DenseDataTable wrapClassName="rounded-none border-0" tableClassName={ledgerTableMinClass.t4Open}>
        <OpenOptDetailColgroup />
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className={closedOptContractHead}>Contract</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Expiry</DenseTableHead>
            <DenseTableHead className={cn(closedOptHeadPrimary, 'text-right')}>Strike</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Stg/Ins</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Trade date</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Side</DenseTableHead>
            <DenseTableHead className={cn(closedOptHeadPrimary, 'text-right')}>Qty</DenseTableHead>
            <DenseTableHead className={cn(closedOptHeadPrimary, 'text-right')}>Price</DenseTableHead>
            <DenseTableHead className={cn(closedOptHeadPrimary, 'text-right')}>Comm.</DenseTableHead>
            <DenseTableHead className={cn(closedOptHeadPrimary, 'text-right')}>PnL</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Account</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Source</DenseTableHead>
            <DenseTableHead className={closedOptHeadPrimary}>Booking</DenseTableHead>
            <DenseTableHead className={closedOptDetailActionsHead}>Actions</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {openExpandedGroups.length === 0 ? (
            <DenseTableRow>
              <DenseTableCell
                colSpan={14}
                className="py-4 text-center italic text-muted-foreground"
              >
                Click an open option row above to load details
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            openExpandedGroups.flatMap(g =>
              (g.trades ?? []).map((ex, ti) => {
                const groupTrades = g.trades ?? []
                const syncSrc = oppositeLegSyncPayload(groupTrades, ex)
                const showSync = onSyncOpposite && ex.account_executions_id != null && syncSrc != null
                const { displayPnl } = ledgerOptDetailRowPnl(ex, linkByOptionId)

                return (
                  <DenseTableRow
                    key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}
                    className={ex.pending ? 'opacity-70' : undefined}
                  >
                    <DenseTableCell className={closedOptDetailContractCell}>
                      <LedgerOptContractCell
                        group={g}
                        linkByOptionId={linkByOptionId}
                        onViewLinks={onViewLinks}
                        showExecId={ex.account_executions_id}
                      />
                    </DenseTableCell>
                    <DenseTableCell className="font-mono text-muted-foreground">
                      {fmtExpiryOccToken(ex.expiry ?? g.expiry)}
                    </DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>{fmtUsd(g.strike)}</DenseTableCell>
                    <DenseTableCell>
                      <LedgerStgInsCell ex={ex} />
                    </DenseTableCell>
                    <DenseTableCell title={ex.time != null ? `Exec time: ${fmtTs(ex.time)}` : undefined}>
                      {fmtLedgerTradeDate(ex.trade_date)}
                    </DenseTableCell>
                    <DenseTableCell>{sideLabel(ex)}</DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>
                      {fillQtyShown(ex.quantity)}
                    </DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>{fmtUsd(ex.price)}</DenseTableCell>
                    <DenseTableCell className={closedOptNumCell}>
                      {fmtUsd(ex.commission ?? 0)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(closedOptNumCell, pnlColorClass(displayPnl))}>
                      {fmtUsd(displayPnl)}
                    </DenseTableCell>
                    <DenseTableCell className="font-mono text-dense-meta text-muted-foreground">
                      {ex.account_id ?? '—'}
                    </DenseTableCell>
                    <DenseTableCell>
                      <ExecSourceBadge source={ex.source} />
                      {ex.pending && (
                        <DenseTag variant="warning" size="cell" className="ml-1 whitespace-nowrap" title={PENDING_TITLE}>
                          pending
                        </DenseTag>
                      )}
                    </DenseTableCell>
                    <DenseTableCell>
                      <LedgerBookingTagForFill ex={ex} stockFills={stockFills} />
                    </DenseTableCell>
                    <DenseTableCell className={closedOptDetailActionsCell}>
                      {ex.pending ? (
                        <span className={denseTable.mutedMeta} title="Actions open once Flex confirms this fill">—</span>
                      ) : ex.account_executions_id != null ? (
                        <LedgerOptActionButtons
                          onEdit={onEdit ? () => onEdit(ex) : undefined}
                          onLink={
                            onLinkStrategy ? () => onLinkStrategy(ex, groupTrades) : undefined
                          }
                          onLinkStock={onLinkStock ? () => onLinkStock(ex) : undefined}
                          onDelete={onDelete ? () => onDelete(ex) : undefined}
                          onSync={
                            showSync && syncSrc && onSyncOpposite
                              ? () => onSyncOpposite(ex, syncSrc)
                              : undefined
                          }
                          syncDisabled={syncingId === ex.account_executions_id}
                          syncSpinning={syncingId === ex.account_executions_id}
                          error={
                            syncError?.id === ex.account_executions_id ? syncError.message : undefined
                          }
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
      </DenseDataTable>
    </section>
  )
}
