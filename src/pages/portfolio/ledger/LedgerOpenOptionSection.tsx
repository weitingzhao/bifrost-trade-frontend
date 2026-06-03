import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fmtExpiry, fmtTradeDate, fmtTs, fmtUsd, getContractLabelParts } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  findOppositeLegAttributionSource,
  getOptGroupKey,
  ledgerOptDetailRowPnl,
} from '@/utils/ledger/ledgerOptHelpers'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { sideLabel } from './ledgerOptSideLabel'
import { LedgerStgInsCell } from './LedgerStgInsCell'
import type { OptGroupCallbacks } from './ledgerTypes'
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
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'

function tradesSummary(g: OptExecutionGroup): string {
  return (g.trades ?? [])
    .map(ex => {
      const q = ex.quantity != null ? Number(ex.quantity) : NaN
      const p = ex.price != null ? Number(ex.price) : NaN
      const idLabel = ex.account_executions_id != null ? `#${ex.account_executions_id}` : 'id?'
      const parts: string[] = [sideLabel(ex)]
      if (Number.isFinite(q)) parts.push(String(q))
      if (Number.isFinite(p)) parts.push(`@${p}`)
      parts.push(`(${idLabel})`)
      return parts.join(' ')
    })
    .join('; ')
}

function OpenGroupTable({
  groups,
  expandedDetailKeys,
  toggleDetailExpand,
  showExpiredClose,
  onExpiredClose,
}: {
  groups: OptExecutionGroup[]
  expandedDetailKeys: string[]
  toggleDetailExpand: (key: string) => void
  showExpiredClose?: boolean
  onExpiredClose?: (ex: Execution) => void
}) {
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="w-8" aria-hidden />
          <DenseTableHead>Contract</DenseTableHead>
          <DenseTableHead>Account</DenseTableHead>
          <DenseTableHead>Expiry</DenseTableHead>
          <DenseTableHead>STRIKE</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Net qty</DenseTableHead>
          <DenseTableHead>Trades (side / qty / price / id)</DenseTableHead>
          <DenseTableHead>Source</DenseTableHead>
          {showExpiredClose && (
            <DenseTableHead className={`${denseTableNumCell} w-16`}>Actions</DenseTableHead>
          )}
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {groups.map(g => {
          const p = getContractLabelParts(g.contract_key ?? '')
          const strikeStr = g.strike != null ? ` ${g.strike}` : ''
          const groupKey = getOptGroupKey(g)
          const isExpanded = expandedDetailKeys.includes(groupKey)
          const uniqueAccounts = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.account_id ?? '').trim()).filter(Boolean)),
          )
          const uniqueSources = Array.from(
            new Set((g.trades ?? []).map(ex => (ex.source ?? '').trim()).filter(Boolean)),
          )
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
                  label="Expand open group details"
                />
              </DenseTableCell>
              <DenseTableCell className="font-mono text-[length:var(--text-dense-meta)] whitespace-nowrap">
                {p.symbol ? (
                  <>
                    <strong>{p.symbol}</strong> {p.rightLabel}
                    {strikeStr}
                  </>
                ) : (
                  g.contract_key
                )}
              </DenseTableCell>
              <DenseTableCell>
                {uniqueAccounts.length > 0 ? uniqueAccounts.join(', ') : '—'}
              </DenseTableCell>
              <DenseTableCell>{fmtExpiry(g.expiry)}</DenseTableCell>
              <DenseTableCell>
                <strong>{fmtUsd(g.strike)}</strong>
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>{g.net_qty}</DenseTableCell>
              <DenseTableCell>{tradesSummary(g) || '—'}</DenseTableCell>
              <DenseTableCell>
                {uniqueSources.length > 0
                  ? uniqueSources.map(s => <ExecSourceBadge key={s} source={s} />)
                  : '—'}
              </DenseTableCell>
              {showExpiredClose && (
                <DenseTableCell className={denseTableNumCell}>
                  <div onClick={e => e.stopPropagation()}>
                    {onExpiredClose && g.trades?.[0] != null && (
                      <IconActionButton
                        onClick={() => onExpiredClose(g.trades[0])}
                        title="Close expired position"
                        ariaLabel="Close expired position"
                        tone="warn"
                        size="dense"
                      >
                        ✕
                      </IconActionButton>
                    )}
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
} & OptGroupCallbacks

export function LedgerOpenOptionSection({
  openActiveGroups,
  openExpiredGroups,
  openExpandedGroups,
  expandedDetailKeys,
  toggleDetailExpand,
  linkByOptionId,
  onEdit,
  onDelete,
  onLinkStrategy,
  onExpiredClose,
  onSyncOpposite,
  syncingId,
}: Props) {
  if (openActiveGroups.length === 0 && openExpiredGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No open option groups.</p>
  }

  const sectionTitleClass = cn(
    denseTable.sectionTitle,
    'inline-flex items-center gap-1.5',
  )

  return (
    <>
      {openActiveGroups.length > 0 && (
        <div className={denseTable.sectionBlock}>
          <h5 className={sectionTitleClass}>
            Open Option
            <InfoTooltip text="Option positions with non-zero net quantity and future expiry. They are excluded from the Summary (fully closed trades only) and the Closed Option table above." />
          </h5>
          <OpenGroupTable
            groups={openActiveGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
          />
        </div>
      )}

      {openExpiredGroups.length > 0 && (
        <div className={cn(denseTable.sectionBlock, 'mt-4')}>
          <h5 className={sectionTitleClass}>
            Expired but not closed
            <InfoTooltip text="These option contracts have expired but net quantity is not zero. Some executions may be missing in the trade ledger; add the missing trades to close the position." />
          </h5>
          <OpenGroupTable
            groups={openExpiredGroups}
            expandedDetailKeys={expandedDetailKeys}
            toggleDetailExpand={toggleDetailExpand}
            showExpiredClose
            onExpiredClose={onExpiredClose}
          />
        </div>
      )}

      <h5 className={cn(sectionTitleClass, 'mt-4')}>
        Details (per trade)
        <InfoTooltip text="Click an open option row above to load its execution details." />
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
          {openExpandedGroups.length === 0 ? (
            <DenseTableRow className="hover:bg-transparent">
              <DenseTableCell
                colSpan={13}
                className="py-4 text-center italic text-muted-foreground"
              >
                Click an open option row above to load details
              </DenseTableCell>
            </DenseTableRow>
          ) : (
            openExpandedGroups.flatMap(g =>
              (g.trades ?? []).map((ex, ti) => {
                const groupTrades = g.trades ?? []
                const oppositePeer = findOppositeLegAttributionSource(groupTrades, ex)
                const showSync =
                  onSyncOpposite &&
                  ex.account_executions_id != null &&
                  (ex.strategy_instance_id == null ||
                    !Number.isFinite(Number(ex.strategy_instance_id))) &&
                  oppositePeer != null
                const { displayPnl } = ledgerOptDetailRowPnl(ex, linkByOptionId)
                const p_ = getContractLabelParts(g.contract_key ?? '')
                const strikeStr_ = g.strike != null ? ` ${g.strike}` : ''

                return (
                  <DenseTableRow key={`${getOptGroupKey(g)}-${ti}-${ex.time ?? ti}`}>
                    <DenseTableCell className="font-mono text-[length:var(--text-dense-meta)] whitespace-nowrap">
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
                        g.contract_key
                      )}
                    </DenseTableCell>
                    <DenseTableCell>{fmtExpiry(ex.expiry ?? g.expiry)}</DenseTableCell>
                    <DenseTableCell>
                      <strong>{fmtUsd(g.strike)}</strong>
                    </DenseTableCell>
                    <DenseTableCell>
                      <LedgerStgInsCell ex={ex} />
                    </DenseTableCell>
                    <DenseTableCell title={ex.time != null ? `Exec time: ${fmtTs(ex.time)}` : undefined}>
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
                    <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(displayPnl))}>
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
                            onLinkStrategy ? () => onLinkStrategy(ex, groupTrades) : undefined
                          }
                          onDelete={onDelete ? () => onDelete(ex) : undefined}
                          onSync={
                            showSync && oppositePeer && onSyncOpposite
                              ? () =>
                                  onSyncOpposite(ex, {
                                    opportunity_id: oppositePeer.strategy_opportunity_id!,
                                    instance_id: oppositePeer.strategy_instance_id!,
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
      </DenseDataTable>
    </>
  )
}
