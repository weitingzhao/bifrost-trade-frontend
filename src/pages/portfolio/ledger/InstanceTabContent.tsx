import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { pnlColorClass } from '@/utils/dailyChange'
import { OptGroupsTable } from './OptGroupsTable'
import { LedgerInstanceCard } from './LedgerInstanceCard'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { fmtCcy, fmtPrice } from './ledgerFormat'
import type { GroupBy, InstanceSubTab, InstGroup } from './ledgerTypes'
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

export function InstanceTabContent({
  instanceSubTab, filteredGroups, noInstGroups, noInstExecs, linkByOptionId,
  groupBy, displayBuckets, outerExpanded, toggleOuter,
  expandedGroups, toggleGroup, onEdit, onDelete,
  onLinkStrategy, onViewLinks, syncingId, onSyncOpposite,
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
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onLinkStrategy?: (e: Execution) => void
  onViewLinks?: (ctx: { title: string; oid: number }) => void
  syncingId?: number | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
}) {
  const [innerExpanded, setInnerExpanded] = useState<Set<string>>(new Set())
  function toggleInner(key: string) {
    setInnerExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (instanceSubTab === 'no_instance') {
    return (
      <div className="space-y-4">
        {noInstGroups.length === 0 ? (
          <p className={denseTable.emptyHint}>No unassigned option groups.</p>
        ) : (
          <>
            <h3 className={denseTable.sectionTitle}>
              No Instance — Closed ({noInstGroups.filter(g => g.status === 'realized').length})
            </h3>
            <OptGroupsTable
              groups={noInstGroups.filter(g => g.status === 'realized')}
              showNetQty={false}
              linkByOptionId={linkByOptionId}
              expandedGroups={innerExpanded}
              toggleGroup={toggleInner}
              keyPrefix="ni-c-"
              onEdit={onEdit}
              onDelete={onDelete}
              onLinkStrategy={onLinkStrategy}
              onViewLinks={onViewLinks}
              syncingId={syncingId}
              onSyncOpposite={onSyncOpposite}
            />
            {noInstGroups.some(g => g.status === 'unrealized') && (
              <>
                <h3 className={denseTable.sectionTitle}>
                  No Instance — Open ({noInstGroups.filter(g => g.status === 'unrealized').length})
                </h3>
                <OptGroupsTable
                  groups={noInstGroups.filter(g => g.status === 'unrealized')}
                  showNetQty
                  linkByOptionId={linkByOptionId}
                  expandedGroups={innerExpanded}
                  toggleGroup={toggleInner}
                  keyPrefix="ni-o-"
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLinkStrategy={onLinkStrategy}
                  onViewLinks={onViewLinks}
                  syncingId={syncingId}
                  onSyncOpposite={onSyncOpposite}
                />
              </>
            )}
          </>
        )}
        {noInstExecs.length > 0 && (
          <section>
            <h3 className={denseTable.sectionTitle}>
              Raw executions without instance ({noInstExecs.length})
            </h3>
            <DenseDataTable>
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
                {noInstExecs.slice(0, 100).map(e => (
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
                      {closedGs.length > 0 && (
                        <OptGroupsTable
                          groups={closedGs}
                          showNetQty={false}
                          linkByOptionId={linkByOptionId}
                          expandedGroups={innerExpanded}
                          toggleGroup={toggleInner}
                          keyPrefix={`${key}-c-`}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onLinkStrategy={onLinkStrategy}
                          onViewLinks={onViewLinks}
                          syncingId={syncingId}
                          onSyncOpposite={onSyncOpposite}
                        />
                      )}
                      {openGs.length > 0 && (
                        <OptGroupsTable
                          groups={openGs}
                          showNetQty
                          linkByOptionId={linkByOptionId}
                          expandedGroups={innerExpanded}
                          toggleGroup={toggleInner}
                          keyPrefix={`${key}-o-`}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onLinkStrategy={onLinkStrategy}
                          onViewLinks={onViewLinks}
                          syncingId={syncingId}
                          onSyncOpposite={onSyncOpposite}
                        />
                      )}
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
