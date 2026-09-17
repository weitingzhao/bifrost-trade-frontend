import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GroupBy, InstanceSubTab, MainTab } from '@/pages/portfolio/ledger/ledgerTypes'
import { isSharesTab } from '@/pages/portfolio/ledger/ledgerTypes'
import { pruneExpandedKeys } from '@/pages/portfolio/ledger/ledgerExpandKeys'

type DisplayBucket = { key: string }

export function useLedgerUiSync(params: {
  stkCategoryOptions: string[]
  stkCategoryTab: string
  setStkCategoryTab: (v: string) => void
  groupBy: GroupBy
  strategyDisplayBuckets: DisplayBucket[]
  instanceDisplayBuckets: DisplayBucket[]
  setOuterStrategyExpanded: Dispatch<SetStateAction<Set<string>>>
  setOuterInstanceExpanded: Dispatch<SetStateAction<Set<string>>>
  activeTab: MainTab
  instanceSubTab: InstanceSubTab
  setInstanceSubTab: (v: InstanceSubTab) => void
  instanceGroupsRaw: { withInst: unknown[]; noInst: unknown[] }
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
    instanceDisplayBuckets,
    setOuterStrategyExpanded,
    setOuterInstanceExpanded,
    activeTab,
    instanceSubTab,
    setInstanceSubTab,
    instanceGroupsRaw,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    hasComboExecs,
    isLoading,
    setActiveTab,
  } = params

  useEffect(() => {
    if (stkCategoryTab !== 'All' && stkCategoryTab !== 'Uncategorized' && !stkCategoryOptions.includes(stkCategoryTab)) {
      setStkCategoryTab('All')
    }
  }, [stkCategoryOptions, stkCategoryTab, setStkCategoryTab])

  useEffect(() => {
    const opp = groupBy === 'opportunity'
    setOuterStrategyExpanded(prev =>
      pruneExpandedKeys(prev, strategyDisplayBuckets.map(b => b.key), opp),
    )
    setOuterInstanceExpanded(prev =>
      pruneExpandedKeys(prev, instanceDisplayBuckets.map(b => b.key), opp),
    )
  }, [
    groupBy,
    strategyDisplayBuckets,
    instanceDisplayBuckets,
    setOuterStrategyExpanded,
    setOuterInstanceExpanded,
  ])

  useEffect(() => {
    if (activeTab !== 'instance') return
    const hasWithInst = instanceGroupsRaw.withInst.length > 0
    const hasNoInst = instanceGroupsRaw.noInst.length > 0
    if (instanceSubTab === 'with_instance' && !hasWithInst && hasNoInst) setInstanceSubTab('no_instance')
    if (instanceSubTab === 'no_instance' && !hasNoInst && hasWithInst) setInstanceSubTab('with_instance')
  }, [activeTab, instanceSubTab, instanceGroupsRaw, setInstanceSubTab])

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
