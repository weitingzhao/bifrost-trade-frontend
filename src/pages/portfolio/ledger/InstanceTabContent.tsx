import { Fragment, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { pnlColorClass } from '@/utils/dailyChange'
import { LedgerInstanceCard } from './LedgerInstanceCard'
import { LedgerInstanceFillsTable } from './LedgerInstanceFillsTable'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { LedgerPaginationBar } from './LedgerPaginationBar'
import { fmtCcy, fmtPrice } from './ledgerFormat'
import { ledgerContractDisplay } from './ledgerContractMark'
import { PAGE_SIZE } from './ledgerConstants'
import { ledgerTableMinClass } from './ledgerTableFloors'
import { ledgerShell } from './ledgerShellUi'
import type { GroupBy, InstanceSubTab, InstGroup, OptGroupCallbacks } from './ledgerTypes'
import {
  CollapsibleChevron,
  denseTable,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtLedgerTradeDate } from './ledgerTradeDate'

/**
 * One contract: a line (name, expiry, sizes, P&L) over its fills.
 * Under an open instance the fills show at once, as the prototype draws them; in the
 * No instance list there is no parent row, so each contract opens on its own.
 */
function ContractFillBlock({
  group,
  linkByOptionId,
  innerExpanded,
  toggleInner,
  blockKey,
  collapsible = false,
  ...cbs
}: {
  group: OptExecutionGroup
  linkByOptionId: Record<number, OptionStockLinkSummary>
  innerExpanded: Set<string>
  toggleInner: (k: string) => void
  blockKey: string
  collapsible?: boolean
} & OptGroupCallbacks) {
  const { mark, occ } = ledgerContractDisplay(group)
  const pnl = adjustedRealizedPnlForOptGroup(group, linkByOptionId)
  const open = !collapsible || innerExpanded.has(blockKey)
  const fills = group.trades.length
  const line = (
    <>
      {collapsible ? (
        <CollapsibleChevron expanded={open} className={cn('h-3 w-3 self-center', open ? 'rotate-0' : '-rotate-90')} />
      ) : null}
      <span className="font-mono text-dense-body text-foreground" title={occ}>{mark}</span>
      <span className="font-mono text-dense-meta text-muted-foreground">
        net {group.net_qty} · total {group.buy_volume + group.sell_volume} · {fills} {fills === 1 ? 'fill' : 'fills'}
      </span>
      <span className={cn('ml-auto font-mono text-dense-body font-bold tabular-nums', pnlColorClass(pnl))}>
        {fmtCcy(pnl)}
      </span>
    </>
  )
  const lineClass = 'flex w-full min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1 px-0.5 pt-2 pb-1.5 text-left'
  return (
    <div className="min-w-0">
      {collapsible ? (
        <button
          type="button"
          className={cn(lineClass, 'cursor-pointer border-0 bg-transparent')}
          onClick={() => toggleInner(blockKey)}
          aria-expanded={open}
        >
          {line}
        </button>
      ) : (
        <div className={lineClass}>{line}</div>
      )}
      {open ? <LedgerInstanceFillsTable fills={group.trades ?? []} {...cbs} /> : null}
    </div>
  )
}

export function InstanceTabContent({
  instanceSubTab, filteredGroups, noInstGroups, noInstExecs, linkByOptionId,
  groupBy, displayBuckets, outerExpanded, toggleOuter,
  expandedGroups, toggleGroup, accordionMode,
  onEdit, onDelete,
  onLinkStrategy, onLinkStock, onViewLinks, syncingId, syncError, onSyncOpposite, stockFills,
}: {
  instanceSubTab: InstanceSubTab
  filteredGroups: InstGroup[]
  noInstGroups: OptExecutionGroup[]
  noInstExecs: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  groupBy: GroupBy
  displayBuckets: { key: string; label: string; groups: InstGroup[] }[]
  outerExpanded: Set<string>
  toggleOuter: (k: string) => void
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
  accordionMode: boolean
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onLinkStrategy?: (e: Execution, sameContractTrades?: Execution[]) => void
  onLinkStock?: (e: Execution) => void
  onViewLinks?: (ctx: import('./LedgerOptContractCell').ViewLinksPayload) => void
  syncingId?: number | null
  syncError?: { id: number; message: string } | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
  stockFills?: Execution[]
}) {
  const [innerExpanded, setInnerExpanded] = useState<Set<string>>(new Set())
  const [rawPage, setRawPage] = useState(1)
  function toggleInner(key: string) {
    setInnerExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else {
        if (accordionMode) next.clear()
        next.add(key)
      }
      return next
    })
  }

  const cbs: OptGroupCallbacks = {
    onEdit, onDelete, onLinkStrategy, onLinkStock, onViewLinks, syncingId, syncError, onSyncOpposite, stockFills,
  }

  if (instanceSubTab === 'no_instance') {
    const rawTotal = noInstExecs.length
    const rawStart = (rawPage - 1) * PAGE_SIZE
    const rawSlice = noInstExecs.slice(rawStart, rawStart + PAGE_SIZE)
    return (
      <div className="space-y-3">
        {noInstGroups.length === 0 ? (
          <p className={denseTable.emptyHint}>No unassigned option groups.</p>
        ) : (
          <>
            <div className={cn(ledgerShell.panel, 'px-2.5 pb-2')}>
              {noInstGroups.filter(g => g.status === 'realized').map(g => (
                <ContractFillBlock
                  key={`ni-c-${g.contract_key}`}
                  collapsible
                  group={g}
                  linkByOptionId={linkByOptionId}
                  innerExpanded={innerExpanded}
                  toggleInner={toggleInner}
                  blockKey={`ni-c-${g.contract_key}`}
                  {...cbs}
                />
              ))}
              {noInstGroups.some(g => g.status === 'unrealized') && (
                <>
                  <h3 className={cn(ledgerShell.cap, 'm-0 pt-2.5')}>
                    Open · no instance ({noInstGroups.filter(g => g.status === 'unrealized').length})
                  </h3>
                  {noInstGroups.filter(g => g.status === 'unrealized').map(g => (
                    <ContractFillBlock
                      key={`ni-o-${g.contract_key}`}
                      collapsible
                      group={g}
                      linkByOptionId={linkByOptionId}
                      innerExpanded={innerExpanded}
                      toggleInner={toggleInner}
                      blockKey={`ni-o-${g.contract_key}`}
                      {...cbs}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )}
        {rawTotal > 0 && (
          <section>
            <h3 className={cn(ledgerShell.cap, 'm-0 mb-1.5')}>
              Raw executions without instance · showing {rawSlice.length} of {rawTotal}
            </h3>
            <DenseDataTable tableClassName={ledgerTableMinClass.t2}>
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Date</DenseTableHead>
                  <DenseTableHead>Symbol</DenseTableHead>
                  <DenseTableHead>Side</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>PnL</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Actions</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rawSlice.map(e => (
                  <DenseTableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`}>
                    <DenseTableCell className="font-mono">{fmtLedgerTradeDate(e.trade_date)}</DenseTableCell>
                    <DenseTableCell className="font-medium">{e.symbol}</DenseTableCell>
                    <DenseTableCell>{e.side}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {Math.abs(e.quantity ?? e.qty)}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{fmtPrice(e.price)}</DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(e.realized_pnl ?? 0))}>
                      {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      <LedgerOptActionButtons
                        onLink={onLinkStrategy ? () => onLinkStrategy(e) : undefined}
                        onEdit={() => onEdit(e)}
                        onDelete={() => onDelete(e)}
                      />
                    </DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
            <LedgerPaginationBar
              page={rawPage}
              total={rawTotal}
              pageSize={PAGE_SIZE}
              onPage={setRawPage}
            />
          </section>
        )}
      </div>
    )
  }

  if (filteredGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No instances match the current filter.</p>
  }

  const showOuter = groupBy !== 'opportunity'
  return (
    <div className={ledgerShell.panel}>
      {displayBuckets.map(bucket => {
        const bucketExpanded = showOuter ? outerExpanded.has(bucket.key) : true
        return (
          <Fragment key={bucket.key}>
            {showOuter && (
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 border-0 border-b border-border bg-transparent px-2.5 py-1.5 text-left hover:bg-secondary/40"
                onClick={() => toggleOuter(bucket.key)}
                aria-expanded={bucketExpanded}
              >
                <CollapsibleChevron
                  expanded={bucketExpanded}
                  className={cn('h-3 w-3', bucketExpanded ? 'rotate-0' : '-rotate-90')}
                />
                <span className={cn(ledgerShell.cap, 'text-foreground/85')}>{bucket.label}</span>
                <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
                  {bucket.groups.length} {bucket.groups.length === 1 ? 'instance' : 'instances'}
                </span>
              </button>
            )}
            {bucketExpanded && (
              <div className={showOuter ? 'pl-3' : undefined}>
                {bucket.groups.map(ig => {
                  const key = `inst-${ig.instanceId}`
                  const expanded = expandedGroups.has(key)
                  const closedGs = ig.groups.filter(g => g.status === 'realized')
                  const openGs = ig.groups.filter(g => g.status === 'unrealized')
                  const instPnl = closedGs.reduce(
                    (s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId),
                    0,
                  )
                  return (
                    <LedgerInstanceCard
                      key={key}
                      instanceId={ig.instanceId}
                      label={ig.label}
                      oppName={ig.oppName}
                      closedCount={closedGs.length}
                      openCount={openGs.length}
                      pnl={instPnl}
                      expanded={expanded}
                      onToggle={() => toggleGroup(key)}
                    >
                      {[...closedGs, ...openGs].map(g => (
                        <ContractFillBlock
                          key={`${key}-${g.contract_key}`}
                          group={g}
                          linkByOptionId={linkByOptionId}
                          innerExpanded={innerExpanded}
                          toggleInner={toggleInner}
                          blockKey={`${key}-${g.contract_key}`}
                          {...cbs}
                        />
                      ))}
                    </LedgerInstanceCard>
                  )
                })}
              </div>
            )}
          </Fragment>
        )
      })}
      <p className={ledgerShell.panelFoot}>
        Row actions write to the ledger only: edit a fill, link it to an instance, view its option ↔ stock links, sync
        the opposite leg, delete. Nothing here is sent to the broker.
      </p>
    </div>
  )
}
