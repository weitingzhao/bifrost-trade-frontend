import type { Execution } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'

export type MainTab =
  | 'strategy'
  | 'instance'
  | 'options'
  | 'stocks'
  | 'fixed_income'
  | 'cash_like'
  | 'combos'
  | 'all'
export type SharesTab = 'stocks' | 'fixed_income' | 'cash_like' | 'combos' | 'all'
export type OptSortCol = 'expiry' | 'trade_date'
export type StkSortCol = 'trade_date' | 'realized_pnl'
export type GroupBy = 'opportunity' | 'structure' | 'watchlist_symbol'
export type OptSubTab = 'contracts' | 'orphans'
export type InstanceSubTab = 'with_instance' | 'no_instance' | 'contains_open'
/** Strategy view scope: every opportunity, or only the fills filed under none. */
export type StrategyScope = 'all' | 'unlinked'

export function isSharesTab(tab: MainTab): tab is SharesTab {
  return (
    tab === 'stocks' ||
    tab === 'fixed_income' ||
    tab === 'cash_like' ||
    tab === 'combos' ||
    tab === 'all'
  )
}
export type OptInstanceFilter = 'all' | 'has_instance' | 'no_instance' | 'mixed'

export type OptGroupCallbacks = {
  onEdit?: (e: Execution) => void
  onDelete?: (e: Execution) => void
  onLinkStrategy?: (e: Execution, sameContractTrades?: Execution[]) => void
  onLinkStock?: (e: Execution) => void
  onViewLinks?: (ctx: import('./LedgerOptContractCell').ViewLinksPayload) => void
  onExpiredClose?: (group: OptExecutionGroup) => void
  syncingId?: number | null
  syncError?: { id: number; message: string } | null
  onSyncOpposite?: (e: Execution, src: { opportunity_id: number; instance_id: number }) => void
  stockFills?: Execution[]
}

export type StkPositionGroup = {
  key: string
  accountId: string
  symbol: string
  fills: Execution[]
  realized: number
  unrealized: number | null
  snap: { position: number; avgCost: number; price: number | null } | undefined
}

export type StratOppGroup = {
  opportunityId: number | 'none'
  title: string
  structure: string
  instanceSubgroups: {
    instanceId: number | 'none'
    label: string | null
    groups: OptExecutionGroup[]
  }[]
}

export type InstGroup = {
  instanceId: number
  label: string | null
  oppName: string | null
  structure: string
  groups: OptExecutionGroup[]
  trades: Execution[]
}

export type { OptExecutionGroup, OptionStockLinkSummary }
