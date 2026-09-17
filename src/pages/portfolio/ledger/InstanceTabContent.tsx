import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { pnlColorClass } from '@/utils/dailyChange'
import { LedgerInstanceCard } from './LedgerInstanceCard'
import { LedgerInstanceFillsTable } from './LedgerInstanceFillsTable'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { LedgerPaginationBar } from './LedgerPaginationBar'
import { fmtCcy, fmtPrice } from './ledgerFormat'
import { ledgerContractDisplay } from './ledgerContractMark'
import { PAGE_SIZE } from './ledgerConstants'
import { ledgerTableMinClass } from './ledgerTableFloors'
import type { GroupBy, InstanceSubTab, InstGroup, OptGroupCallbacks } from './ledgerTypes'
import {
  CollapsibleBucketHeader,
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

function ContractFillBlock({
  group,
  linkByOptionId,
  innerExpanded,
  toggleInner,
  blockKey,
  ...cbs
}: {
  group: OptExecutionGroup
  linkByOptionId: Record<number, OptionStockLinkSummary>
  innerExpanded: Set<string>
  toggleInner: (k: string) => void
  blockKey: string
} & OptGroupCallbacks) {
  const { mark, occ } = ledgerContractDisplay(group)
  const pnl = adjustedRealizedPnlForOptGroup(group, linkByOptionId)
  const open = innerExpanded.has(blockKey)
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex w-full min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-0 bg-transparent px-0.5 py-1 text-left cursor-pointer"
        onClick={() => toggleInner(blockKey)}
        aria-expanded={open}
      >
        <span className="font-mono text-foreground" title={occ}>{mark}</span>
        <span className="font-mono text-dense-meta text-muted-foreground">
          net {group.net_qty} · total {group.buy_volume + group.sell_volume} · {group.trades.length} fills
        </span>
        <span className={cn('ml-auto font-mono text-dense-body font-bold tabular-nums', pnlColorClass(pnl))}>
          {fmtCcy(pnl)}
        </span>
      </button>
      {open ? <LedgerInstanceFillsTable fills={group.trades ?? []} {...cbs} /> : null}
    </div>
  )
}

export function InstanceTabContent({
  instanceSubTab, filteredGroups, noInstGroups, noInstExecs, linkByOptionId,
  groupBy, displayBuckets, outerExpanded, toggleOuter,
  expandedGroups, toggleGroup, accordionMode,
  onEdit, onDelete,
  onLinkStrategy, onLinkStock, onViewLinks, syncingId, syncError, onSyncOpposite,
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
    onEdit, onDelete, onLinkStrategy, onLinkStock, onViewLinks, syncingId, syncError, onSyncOpposite,
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
            {noInstGroups.filter(g => g.status === 'realized').map(g => (
              <ContractFillBlock
                key={`ni-c-${g.contract_key}`}
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
                <h3 className={denseTable.sectionTitle}>
                  No Instance — Open ({noInstGroups.filter(g => g.status === 'unrealized').length})
                </h3>
                {noInstGroups.filter(g => g.status === 'unrealized').map(g => (
                  <ContractFillBlock
                    key={`ni-o-${g.contract_key}`}
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
          </>
        )}
        {rawTotal > 0 && (
          <section>
            <h3 className={denseTable.sectionTitle}>
              Raw executions without instance (showing {rawSlice.length} of {rawTotal})
            </h3>
            <DenseDataTable tableClassName={ledgerTableMinClass.t2}>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Date</DenseTableHead>
                  <DenseTableHead>Symbol</DenseTableHead>
                  <DenseTableHead>Side</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
                  <DenseTableHead className={denseTableNumCell}>PnL</DenseTableHead>
                  <DenseTableHead className={`${denseTableNumCell} w-[4.5rem]`}>Actions</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rawSlice.map(e => (
                  <DenseTableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`}>
                    <DenseTableCell className="font-mono">{executionDateStr(e)}</DenseTableCell>
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

  return (
    <div className="space-y-2">
      {filteredGroups.length === 0 && (
        <p className={denseTable.emptyHint}>No instances match the current filter.</p>
      )}
      {displayBuckets.map(bucket => {
        const showOuter = groupBy !== 'opportunity'
        const bucketExpanded = showOuter ? outerExpanded.has(bucket.key) : true
        return (
          <div key={bucket.key}>
            {showOuter && (
              <CollapsibleBucketHeader
                expanded={bucketExpanded}
                onToggle={() => toggleOuter(bucket.key)}
                label={bucket.label}
                count={bucket.groups.length}
              />
            )}
            {bucketExpanded && (
              <div className={cn('space-y-2', showOuter && 'ml-2 mt-1')}>
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
          </div>
        )
      })}
    </div>
  )
}
