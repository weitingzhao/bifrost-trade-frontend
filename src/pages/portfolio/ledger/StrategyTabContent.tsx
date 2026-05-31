import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { OptGroupsTable } from './OptGroupsTable'
import { fmtCcy, pnlClass } from './ledgerFormat'
import type { GroupBy, StratOppGroup } from './ledgerTypes'

export function StrategyTabContent({
  displayBuckets, groupBy, linkByOptionId,
  outerExpanded, toggleOuter,
  strategyOppExpanded, toggleStrategyOpp,
  strategyInstExpanded, toggleStrategyInst,
  innerExpanded, toggleInner,
  onEdit, onDelete, onLinkStrategy, onViewLinks, syncingId, onSyncOpposite,
}: {
  displayBuckets: { key: string; label: string; groups: StratOppGroup[] }[]
  groupBy: GroupBy
  linkByOptionId: Record<number, OptionStockLinkSummary>
  outerExpanded: Set<string>
  toggleOuter: (k: string) => void
  strategyOppExpanded: Set<string>
  toggleStrategyOpp: (oppId: number | 'none') => void
  strategyInstExpanded: Set<string>
  toggleStrategyInst: (oppId: number | 'none', instId: number | 'none') => void
  innerExpanded: Set<string>
  toggleInner: (k: string) => void
  onEdit?: (e: Execution) => void
  onDelete?: (e: Execution) => void
  onLinkStrategy?: (e: Execution) => void
  onViewLinks?: (ctx: { title: string; oid: number }) => void
  syncingId?: number | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
}) {
  const allGroups = displayBuckets.flatMap(b => b.groups)
  if (allGroups.length === 0) {
    return <p className="text-xs text-muted-foreground">No option executions found.</p>
  }

  return (
    <div className="space-y-2">
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
                {bucket.groups.map(og => {
                  const oppKey = String(og.opportunityId)
                  const oppExpanded = strategyOppExpanded.has(oppKey)
                  let closedCount = 0, openCount = 0, totalPnl = 0
                  for (const sg of og.instanceSubgroups) {
                    for (const g of sg.groups) {
                      if (g.status === 'realized') { closedCount++; totalPnl += adjustedRealizedPnlForOptGroup(g, linkByOptionId) }
                      else openCount++
                    }
                  }
                  return (
                    <div key={oppKey} className="rounded border">
                      <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleStrategyOpp(og.opportunityId)}>
                        {oppExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <span className="text-sm font-medium truncate">{og.title}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{og.structure}</Badge>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {og.instanceSubgroups.length} inst · {closedCount} closed · {openCount} open
                        </span>
                        <span className={cn('ml-auto text-xs font-mono font-semibold shrink-0', pnlClass(totalPnl))}>
                          {fmtCcy(totalPnl)}
                        </span>
                      </div>
                      {oppExpanded && og.instanceSubgroups.map(sg => {
                        const instKey = `${og.opportunityId}::${sg.instanceId}`
                        const instExpanded = strategyInstExpanded.has(instKey)
                        const closedGs = sg.groups.filter(g => g.status === 'realized')
                        const openCnt = sg.groups.filter(g => g.status === 'unrealized').length
                        const instPnl = closedGs.reduce((s, g) => s + adjustedRealizedPnlForOptGroup(g, linkByOptionId), 0)
                        return (
                          <div key={instKey} className="border-t">
                            <div className="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-muted/30 text-xs"
                              onClick={() => toggleStrategyInst(og.opportunityId, sg.instanceId)}>
                              {instExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              <span className="font-medium">{sg.label ?? 'No instance'}</span>
                              <span className="text-muted-foreground ml-2">{closedGs.length} closed · {openCnt} open</span>
                              <span className={cn('ml-auto font-mono', pnlClass(instPnl))}>{fmtCcy(instPnl)}</span>
                            </div>
                            {instExpanded && closedGs.length > 0 && (
                              <div className="px-4 pb-2">
                                <OptGroupsTable groups={closedGs} showNetQty={false} linkByOptionId={linkByOptionId}
                                  expandedGroups={innerExpanded} toggleGroup={toggleInner} keyPrefix={`${instKey}-`}
                                  onEdit={onEdit} onDelete={onDelete}
                                  onLinkStrategy={onLinkStrategy} onViewLinks={onViewLinks}
                                  syncingId={syncingId} onSyncOpposite={onSyncOpposite} />
                              </div>
                            )}
                            {instExpanded && closedGs.length === 0 && (
                              <p className="text-xs text-muted-foreground px-8 pb-2">No closed contracts in this instance.</p>
                            )}
                          </div>
                        )
                      })}
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
