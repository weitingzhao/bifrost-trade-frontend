import { useMemo } from 'react'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import {
  getOptGroupKey,
  ledgerOptDetailRowPnl,
} from '@/utils/ledger/ledgerOptHelpers'
import { LedgerClosedOptionSection } from './LedgerClosedOptionSection'
import { LedgerOpenOptionSection } from './LedgerOpenOptionSection'
import type { OptGroupCallbacks, OptSortCol, OptSubTab } from './ledgerTypes'
import { closedGroupSummaryPnl } from '@/utils/ledger/ledgerSummaryGroups'

export function OptionsTabContent({
  optSubTab,
  closedGroups,
  openActiveGroups,
  openExpiredGroups,
  linkByOptionId,
  optSort,
  toggleOptSort,
  expandedGroups,
  toggleGroup,
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
  const expandedDetailKeys = useMemo(() => [...expandedGroups], [expandedGroups])

  const closedExpandedGroups = useMemo(
    () => closedGroups.filter(g => expandedGroups.has(getOptGroupKey(g))),
    [closedGroups, expandedGroups],
  )

  const openExpandedGroups = useMemo(
    () => [...openActiveGroups, ...openExpiredGroups].filter(g => expandedGroups.has(getOptGroupKey(g))),
    [openActiveGroups, openExpiredGroups, expandedGroups],
  )

  // Same per-group figure as the health tile and Summary Total; linked stock
  // slippage stays on the rows that have it, under its own label.
  const closedPnlSum = useMemo(
    () => closedGroups.reduce((s, g) => s + closedGroupSummaryPnl(g), 0),
    [closedGroups],
  )

  const detailsTotalPnl = useMemo(() => {
    let sum = 0
    for (const g of closedExpandedGroups) {
      for (const ex of g.trades ?? []) {
        sum += ledgerOptDetailRowPnl(ex, linkByOptionId).displayPnl
      }
    }
    return sum
  }, [closedExpandedGroups, linkByOptionId])

  if (optSubTab === 'contracts') {
    return (
      <LedgerClosedOptionSection
        sortedClosedGroups={closedGroups}
        closedExpandedGroups={closedExpandedGroups}
        closedPnlSum={closedPnlSum}
        detailsTotalPnl={detailsTotalPnl}
        expandedDetailKeys={expandedDetailKeys}
        toggleDetailExpand={toggleGroup}
        optSort={optSort}
        toggleOptSort={toggleOptSort}
        linkByOptionId={linkByOptionId}
        {...cbs}
      />
    )
  }

  return (
    <LedgerOpenOptionSection
      openActiveGroups={openActiveGroups}
      openExpiredGroups={openExpiredGroups}
      openExpandedGroups={openExpandedGroups}
      expandedDetailKeys={expandedDetailKeys}
      toggleDetailExpand={toggleGroup}
      linkByOptionId={linkByOptionId}
      {...cbs}
    />
  )
}
