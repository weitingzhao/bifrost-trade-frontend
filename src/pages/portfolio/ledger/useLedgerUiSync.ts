import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { GroupBy, InstanceSubTab, MainTab } from '@/pages/portfolio/ledger/ledgerTypes'

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
    isLoading,
    setActiveTab,
  } = params

  useEffect(() => {
    if (!stkCategoryOptions.includes(stkCategoryTab)) setStkCategoryTab('All')
  }, [stkCategoryOptions, stkCategoryTab, setStkCategoryTab])

  useEffect(() => {
    if (groupBy === 'opportunity') {
      setOuterStrategyExpanded(new Set())
      setOuterInstanceExpanded(new Set())
    } else {
      setOuterStrategyExpanded(new Set(strategyDisplayBuckets.map(b => b.key)))
      setOuterInstanceExpanded(new Set(instanceDisplayBuckets.map(b => b.key)))
    }
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

  // Keep default Strategy tab; only fall back when the *current* instrument tab has no rows.
  useEffect(() => {
    if (isLoading) return

    if (activeTab === 'stocks' && !hasStkExecs) {
      if (hasOptExecs) setActiveTab('strategy')
      else if (hasFixedIncomeExecs) setActiveTab('fixed_income')
      else if (hasCashLikeExecs) setActiveTab('cash_like')
    }
    if (activeTab === 'fixed_income' && !hasFixedIncomeExecs) {
      if (hasOptExecs) setActiveTab('strategy')
      else if (hasStkExecs) setActiveTab('stocks')
      else if (hasCashLikeExecs) setActiveTab('cash_like')
    }
    if (activeTab === 'cash_like' && !hasCashLikeExecs) {
      if (hasOptExecs) setActiveTab('strategy')
      else if (hasStkExecs) setActiveTab('stocks')
      else if (hasFixedIncomeExecs) setActiveTab('fixed_income')
    }
  }, [
    activeTab,
    isLoading,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    setActiveTab,
  ])
}
