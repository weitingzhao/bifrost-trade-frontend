import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronRight, Link2, Pencil, Trash2 } from 'lucide-react'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { OptGroupsTable } from './OptGroupsTable'
import { fmtCcy, fmtPrice, pnlClass } from './ledgerFormat'
import type { GroupBy, InstanceSubTab, InstGroup } from './ledgerTypes'

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
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  if (instanceSubTab === 'no_instance') {
    return (
      <div className="space-y-4">
        {noInstGroups.length === 0
          ? <p className="text-xs text-muted-foreground">No unassigned option groups.</p>
          : (
            <>
              <h3 className="text-sm font-medium">No Instance — Closed ({noInstGroups.filter(g => g.status === 'realized').length})</h3>
              <OptGroupsTable
                groups={noInstGroups.filter(g => g.status === 'realized')}
                showNetQty={false}
                linkByOptionId={linkByOptionId}
                expandedGroups={innerExpanded}
                toggleGroup={toggleInner}
                keyPrefix="ni-c-"
                onEdit={onEdit} onDelete={onDelete}
                onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                syncingId={syncingId} onSyncOpposite={onSyncOpposite}
              />
              {noInstGroups.some(g => g.status === 'unrealized') && (
                <>
                  <h3 className="text-sm font-medium">No Instance — Open ({noInstGroups.filter(g => g.status === 'unrealized').length})</h3>
                  <OptGroupsTable
                    groups={noInstGroups.filter(g => g.status === 'unrealized')}
                    showNetQty
                    linkByOptionId={linkByOptionId}
                    expandedGroups={innerExpanded}
                    toggleGroup={toggleInner}
                    keyPrefix="ni-o-"
                    onEdit={onEdit} onDelete={onDelete}
                    onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                    syncingId={syncingId} onSyncOpposite={onSyncOpposite}
                  />
                </>
              )}
            </>
          )}
        {noInstExecs.length > 0 && (
          <section>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Raw executions without instance ({noInstExecs.length})</h3>
            <div className="rounded border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-7">Date</TableHead>
                    <TableHead className="h-7">Symbol</TableHead>
                    <TableHead className="h-7">Side</TableHead>
                    <TableHead className="h-7 text-right">Qty</TableHead>
                    <TableHead className="h-7 text-right">Price</TableHead>
                    <TableHead className="h-7 text-right">PnL</TableHead>
                    <TableHead className="h-7 w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noInstExecs.slice(0, 100).map(e => (
                    <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
                      <TableCell className="py-1 font-mono">{executionDateStr(e)}</TableCell>
                      <TableCell className="py-1 font-medium">{e.symbol}</TableCell>
                      <TableCell className="py-1">{e.side}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{Math.abs(e.quantity ?? e.qty)}</TableCell>
                      <TableCell className="py-1 text-right font-mono">{fmtPrice(e.price)}</TableCell>
                      <TableCell className={cn('py-1 text-right font-mono', pnlClass(e.realized_pnl ?? 0))}>
                        {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex gap-0.5">
                          {onLinkStrategy && (
                            <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Link strategy" onClick={() => onLinkStrategy(e)}>
                              <Link2 className="h-3 w-3" />
                            </button>
                          )}
                          <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => onEdit(e)}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => onDelete(e)}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>
    )
  }

  // with_instance sub-tab
  return (
    <div className="space-y-2">
      {filteredGroups.length === 0 && (
        <p className="text-xs text-muted-foreground">No instances match the current filter.</p>
      )}
      {displayBuckets.map(bucket => {
        const showOuter = groupBy !== 'opportunity'
        const bucketExpanded = showOuter ? outerExpanded.has(bucket.key) : true
        return (
          <div key={bucket.key}>
            {showOuter && (
              <button
                className="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-muted/50 text-sm font-semibold"
                onClick={() => toggleOuter(bucket.key)}
              >
                {bucketExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                {bucket.label}
                <span className="text-xs font-normal text-muted-foreground ml-1">({bucket.groups.length})</span>
              </button>
            )}
            {bucketExpanded && (
              <div className={cn('space-y-2', showOuter && 'ml-4 mt-1')}>
                {bucket.groups.map(ig => {
                  const key = `inst-${ig.instanceId}`
                  const expanded = expandedGroups.has(key)
                  const closedGs = ig.groups.filter(g => g.status === 'realized')
                  const openGs = ig.groups.filter(g => g.status === 'unrealized')
                  const instPnl = closedGs.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)
                  return (
                    <div key={key} className="rounded border">
                      <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleGroup(key)}>
                        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="text-sm font-medium">{ig.label ?? `Instance #${ig.instanceId}`}</span>
                        {ig.oppName && <span className="text-xs text-muted-foreground">({ig.oppName})</span>}
                        <span className="text-xs text-muted-foreground ml-2">
                          {closedGs.length} closed · {openGs.length} open
                        </span>
                        <span className={cn('ml-auto text-xs font-mono', pnlClass(instPnl))}>{fmtCcy(instPnl)}</span>
                      </div>
                      {expanded && (
                        <div className="border-t px-2 pb-2 space-y-2">
                          {closedGs.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mt-2 mb-1">Closed ({closedGs.length})</p>
                              <OptGroupsTable groups={closedGs} showNetQty={false} linkByOptionId={linkByOptionId}
                                expandedGroups={innerExpanded} toggleGroup={toggleInner} keyPrefix={`${key}-c-`}
                                onEdit={onEdit} onDelete={onDelete}
                                onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                                syncingId={syncingId} onSyncOpposite={onSyncOpposite} />
                            </div>
                          )}
                          {openGs.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mt-2 mb-1">Open ({openGs.length})</p>
                              <OptGroupsTable groups={openGs} showNetQty linkByOptionId={linkByOptionId}
                                expandedGroups={innerExpanded} toggleGroup={toggleInner} keyPrefix={`${key}-o-`}
                                onEdit={onEdit} onDelete={onDelete}
                                onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                                syncingId={syncingId} onSyncOpposite={onSyncOpposite} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
