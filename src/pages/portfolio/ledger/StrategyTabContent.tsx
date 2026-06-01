import { cn } from '@/lib/utils'
import type { OptionStockLinkSummary } from '@/types/trading'
import { CollapsibleBucketHeader, denseTable } from '@/components/data-display'
import { LedgerStrategyGroup } from './LedgerStrategyGroup'
import type { GroupBy, StratOppGroup } from './ledgerTypes'

export function StrategyTabContent({
  displayBuckets,
  groupBy,
  linkByOptionId,
  outerExpanded,
  toggleOuter,
  strategyOppExpanded,
  toggleStrategyOpp,
  strategyInstExpanded,
  toggleStrategyInst,
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
}) {
  const allGroups = displayBuckets.flatMap(b => b.groups)
  if (allGroups.length === 0) {
    return <p className={denseTable.emptyHint}>No option trades under the current filters.</p>
  }

  return (
    <div className="space-y-2">
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
                {bucket.groups.map(og => (
                  <LedgerStrategyGroup
                    key={String(og.opportunityId)}
                    og={og}
                    expanded={strategyOppExpanded.has(String(og.opportunityId))}
                    onToggle={() => toggleStrategyOpp(og.opportunityId)}
                    strategyInstExpanded={strategyInstExpanded}
                    onToggleInst={toggleStrategyInst}
                    linkByOptionId={linkByOptionId}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
