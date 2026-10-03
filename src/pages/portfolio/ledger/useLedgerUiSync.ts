import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GroupBy, TradeSubTab, MainTab } from '@/pages/portfolio/ledger/ledgerTypes'
import { isSharesTab } from '@/pages/portfolio/ledger/ledgerTypes'
import { pruneExpandedKeys } from '@/pages/portfolio/ledger/ledgerExpandKeys'

type DisplayBucket = { key: string }

export function useLedgerUiSync(params: {
  stkCategoryOptions: string[]
  stkCategoryTab: string
  setStkCategoryTab: (v: string) => void
  groupBy: GroupBy
  strategyDisplayBuckets: DisplayBucket[]
  tradeDisplayBuckets: DisplayBucket[]
  setOuterStrategyExpanded: Dispatch<SetStateAction<Set<string>>>
  setOuterTradeExpanded: Dispatch<SetStateAction<Set<string>>>
  activeTab: MainTab
  tradeSubTab: TradeSubTab
  setTradeSubTab: (v: TradeSubTab) => void
  tradeGroupsRaw: { withInst: unknown[]; noInst: unknown[] }
  hasOptExecs: boolean
  hasStkExecs: boolean
  hasFixedIncomeExecs: boolean
  hasCashLikeExecs: boolean
  hasComboExecs: boolean
  isLoading: boolean
  setActiveTab: (t: MainTab) => void
}) {
  const {
    stkCategoryOptions,
    stkCategoryTab,
    setStkCategoryTab,
    groupBy,
    strategyDisplayBuckets,
    tradeDisplayBuckets,
    setOuterStrategyExpanded,
    setOuterTradeExpanded,
    activeTab,
    tradeSubTab,
    setTradeSubTab,
    tradeGroupsRaw,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    hasComboExecs,
    isLoading,
    setActiveTab,
  } = params

  // Both of these judge the view against the data, so neither may run before
  // the data is there: a category restored from the page's view (Rev .79) is
  // not "missing" while the options are still empty, and folds are not stale
  // while the buckets are.
  useEffect(() => {
    if (isLoading || stkCategoryOptions.length === 0) return
    if (stkCategoryTab !== 'All' && stkCategoryTab !== 'Uncategorized' && !stkCategoryOptions.includes(stkCategoryTab)) {
      setStkCategoryTab('All')
    }
  }, [isLoading, stkCategoryOptions, stkCategoryTab, setStkCategoryTab])

  useEffect(() => {
    if (isLoading) return
    const opp = groupBy === 'opportunity'
    setOuterStrategyExpanded(prev =>
      pruneExpandedKeys(prev, strategyDisplayBuckets.map(b => b.key), opp),
    )
    setOuterTradeExpanded(prev =>
      pruneExpandedKeys(prev, tradeDisplayBuckets.map(b => b.key), opp),
    )
  }, [
    isLoading,
    groupBy,
    strategyDisplayBuckets,
    tradeDisplayBuckets,
    setOuterStrategyExpanded,
    setOuterTradeExpanded,
  ])

  useEffect(() => {
    if (activeTab !== 'instance') return
    const hasWithInst = tradeGroupsRaw.withInst.length > 0
    const hasNoInst = tradeGroupsRaw.noInst.length > 0
    if (tradeSubTab === 'with_instance' && !hasWithInst && hasNoInst) setTradeSubTab('no_instance')
    if (tradeSubTab === 'no_instance' && !hasNoInst && hasWithInst) setTradeSubTab('with_instance')
  }, [activeTab, tradeSubTab, tradeGroupsRaw, setTradeSubTab])

  useEffect(() => {
    if (isLoading) return
    if (!isSharesTab(activeTab)) return
    const empty =
      (activeTab === 'stocks' && !hasStkExecs) ||
      (activeTab === 'fixed_income' && !hasFixedIncomeExecs) ||
      (activeTab === 'cash_like' && !hasCashLikeExecs) ||
      (activeTab === 'combos' && !hasComboExecs) ||
      (activeTab === 'all' &&
        !hasStkExecs &&
        !hasFixedIncomeExecs &&
        !hasCashLikeExecs &&
        !hasComboExecs)
    if (empty && hasOptExecs) setActiveTab('strategy')
  }, [
    activeTab,
    isLoading,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    hasComboExecs,
    setActiveTab,
  ])
}
