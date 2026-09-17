import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { Execution } from '@/types/positions'
import { CollapsibleChevron, denseTable } from '@/components/data-display'
import { LedgerStrategyGroup } from './LedgerStrategyGroup'
import { ledgerShell } from './ledgerShellUi'
import { scopeStrategyBuckets } from './ledgerStrategyScope'
import type { GroupBy, OptExecutionGroup, StratOppGroup, StrategyScope } from './ledgerTypes'

export function StrategyTabContent({
  displayBuckets,
  groupBy,
  scope,
  linkByOptionId,
  outerExpanded,
  toggleOuter,
  strategyOppExpanded,
  toggleStrategyOpp,
  onGoInstance,
  onContractClick,
  stockFills,
}: {
  displayBuckets: { key: string; label: string; groups: StratOppGroup[] }[]
  groupBy: GroupBy
  scope: StrategyScope
  linkByOptionId: Record<number, OptionStockLinkSummary>
  outerExpanded: Set<string>
  toggleOuter: (k: string) => void
  strategyOppExpanded: Set<string>
  toggleStrategyOpp: (oppId: number | 'none') => void
  onGoInstance?: (instanceId: number) => void
  onContractClick?: (group: OptExecutionGroup) => void
  stockFills?: Execution[]
}) {
  const buckets = scopeStrategyBuckets(displayBuckets, scope)
  if (buckets.length === 0) {
    return (
      <p className={denseTable.emptyHint}>
        {scope === 'unlinked'
          ? 'Every option trade under the current filters has an opportunity.'
          : 'No option trades under the current filters.'}
      </p>
    )
  }

  const showOuter = groupBy !== 'opportunity'
  return (
    <div className={ledgerShell.panel}>
      {buckets.map(bucket => {
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
                  {bucket.groups.length} {bucket.groups.length === 1 ? 'opportunity' : 'opportunities'}
                </span>
              </button>
            )}
            {bucketExpanded && (
              <div className={showOuter ? 'pl-3' : undefined}>
                {bucket.groups.map(og => (
                  <LedgerStrategyGroup
                    key={String(og.opportunityId)}
                    og={og}
                    expanded={strategyOppExpanded.has(String(og.opportunityId))}
                    onToggle={() => toggleStrategyOpp(og.opportunityId)}
                    linkByOptionId={linkByOptionId}
                    onGoInstance={onGoInstance}
                    onContractClick={onContractClick}
                    stockFills={stockFills}
                  />
                ))}
              </div>
            )}
          </Fragment>
        )
      })}
      <p className={ledgerShell.panelFoot}>
        Opportunity → instance → contract. An instance id is a link into the strategy layer — this page is where a
        fill acquires its owner, and nothing else in the app does that.
      </p>
    </div>
  )
}
