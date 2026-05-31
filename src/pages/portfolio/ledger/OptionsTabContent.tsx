import { cn } from '@/lib/utils'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import type { OptionStockLinkSummary } from '@/types/trading'
import { OptGroupsTable } from './OptGroupsTable'
import { SortIcon } from './types'
import type { OptSortCol, OptSubTab, OptGroupCallbacks } from './types'

export function OptionsTabContent({
  optSubTab, closedGroups, openActiveGroups, openExpiredGroups,
  linkByOptionId, optSort, toggleOptSort,
  expandedGroups, toggleGroup,
  ...cbs
}: {
  optSubTab: OptSubTab
  closedGroups: OptExecutionGroup[]
  openActiveGroups: OptExecutionGroup[]
  openExpiredGroups: OptExecutionGroup[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  optSort: { col: OptSortCol; dir: 'asc' | 'desc' }
  toggleOptSort: (col: OptSortCol) => void
  expandedGroups: Set<string>
  toggleGroup: (k: string) => void
} & OptGroupCallbacks) {
  const sharedProps = { linkByOptionId, expandedGroups, toggleGroup, ...cbs }

  if (optSubTab === 'contracts') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Closed Contracts ({closedGroups.length})</span>
          <div className="flex items-center gap-0.5">
            {(['expiry', 'trade_date'] as const).map(col => (
              <button
                key={col}
                className={cn('h-6 px-2 text-[11px] rounded font-medium transition-colors', optSort.col === col ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}
                onClick={() => toggleOptSort(col)}
              >
                {col === 'expiry' ? 'Expiry' : 'Trade Date'} <SortIcon active={optSort.col === col} dir={optSort.dir} />
              </button>
            ))}
          </div>
        </div>
        {closedGroups.length === 0
          ? <p className="text-xs text-muted-foreground py-4 text-center">No closed option groups for this period.</p>
          : <OptGroupsTable groups={closedGroups} showNetQty={false} {...sharedProps} />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {openActiveGroups.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Open ({openActiveGroups.length})</p>
          <OptGroupsTable groups={openActiveGroups} showNetQty keyPrefix="active-" {...sharedProps} />
        </section>
      )}
      {openExpiredGroups.length > 0 && (
        <section>
          <p className="text-xs font-medium text-orange-500 mb-2">Expired Unrealized ({openExpiredGroups.length})</p>
          <OptGroupsTable groups={openExpiredGroups} showNetQty keyPrefix="expired-" {...sharedProps} />
        </section>
      )}
      {openActiveGroups.length === 0 && openExpiredGroups.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">No open option groups.</p>
      )}
    </div>
  )
}
