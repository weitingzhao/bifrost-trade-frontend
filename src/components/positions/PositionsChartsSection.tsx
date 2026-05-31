import { useMemo, useState } from 'react'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow, StockCoverageItem } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { OptionStockMixCategory, UnderlyingCategoryFilter } from '@/utils/positionsCharts'
import { filterStocksByBucket } from '@/utils/positionsGrouping'
import { AccountAssetMixCard } from './charts/AccountAssetMixCard'
import { UnderlyingCategoryCard } from './charts/UnderlyingCategoryCard'
import { OptionChartsCard } from './charts/OptionChartsCard'

export type OpenTab = 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

interface Props {
  accounts: IbAccountSnapshot[]
  allStocks: LivePositionRow[]
  hostAccountId: string
  secondaryAccountId: string
  quotesBySymbol: Record<string, QuoteItem>
  quotesByCk: Record<string, QuoteItem>
  watchlistCoverageItems: StockCoverageItem[]
  filterSymbol: string
  onFilterSymbolChange: (sym: string) => void
  onTabChange: (tab: OpenTab) => void
  optionStockMixFilter: OptionStockMixCategory | null
  onOptionStockMixFilterChange: (v: OptionStockMixCategory | null) => void
}

export function PositionsChartsSection({
  accounts,
  allStocks,
  hostAccountId,
  secondaryAccountId,
  quotesBySymbol,
  quotesByCk,
  watchlistCoverageItems,
  filterSymbol,
  onFilterSymbolChange,
  onTabChange,
  optionStockMixFilter,
  onOptionStockMixFilterChange,
}: Props) {
  const [chartAccountId, setChartAccountId] = useState('all')
  const [underlyingCategoryFilter, setUnderlyingCategoryFilter] = useState<
    Record<UnderlyingCategoryFilter, boolean>
  >({
    Stocks: true,
    'Fixed Income': true,
    'Cash-like': true,
  })
  const [activeOptionDetail, setActiveOptionDetail] = useState<string | null>(null)
  const [activeCategoryWeight, setActiveCategoryWeight] = useState<string | null>(null)

  const coreStocks = useMemo(() => filterStocksByBucket(allStocks, 'core'), [allStocks])
  const fixedIncomeStocks = useMemo(() => filterStocksByBucket(allStocks, 'fixed_income'), [allStocks])
  const cashLikeStocks = useMemo(() => filterStocksByBucket(allStocks, 'cash_like'), [allStocks])

  const activeSymbol = filterSymbol.trim().toUpperCase()

  function handleSymbolClick(sym: string) {
    const next = activeSymbol === sym ? '' : sym
    onFilterSymbolChange(next)
  }

  function handleCategoryWeight(label: string | null) {
    if (label == null) {
      setActiveCategoryWeight(null)
      return
    }
    const next = activeCategoryWeight === label ? null : label
    setActiveCategoryWeight(next)
    if (next === 'Fixed Income') onTabChange('fixed_income')
    else if (next === 'Cash-like') onTabChange('cash_like')
    else if (next === 'Stocks') onTabChange('stocks')
  }

  function handleOptionDetail(label: string | null) {
    if (label == null) {
      setActiveOptionDetail(null)
      return
    }
    const next = activeOptionDetail === label ? null : label
    setActiveOptionDetail(next)
    if (next) {
      const sym = label.split(' ')[0] ?? ''
      if (sym) onFilterSymbolChange(sym)
      onTabChange('options')
    }
  }

  function handleOptionCategory(label: string | null) {
    if (label == null) {
      onOptionStockMixFilterChange(null)
      return
    }
    const cat = label as OptionStockMixCategory
    if (optionStockMixFilter === cat) {
      onOptionStockMixFilterChange(null)
      return
    }
    onOptionStockMixFilterChange(cat)
    if (cat === 'Cash-like') onTabChange('cash_like')
    else onTabChange('stocks')
  }

  const hasAnyData = accounts.some((a) => (a.positions?.length ?? 0) > 0)
  if (!hasAnyData) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <AccountAssetMixCard
        accounts={accounts}
        hostAccountId={hostAccountId}
        secondaryAccountId={secondaryAccountId}
        coreStocks={coreStocks}
        fixedIncomeStocks={fixedIncomeStocks}
        cashLikeStocks={cashLikeStocks}
        chartAccountId={chartAccountId}
        onChartAccountIdChange={setChartAccountId}
      />
      <UnderlyingCategoryCard
        accounts={accounts}
        chartAccountId={chartAccountId}
        quotesBySymbol={quotesBySymbol}
        quotesByCk={quotesByCk}
        categoryFilter={underlyingCategoryFilter}
        onCategoryFilterChange={(cat) =>
          setUnderlyingCategoryFilter((prev) => ({ ...prev, [cat]: !prev[cat] }))
        }
        activeSymbol={activeSymbol}
        onSymbolClick={handleSymbolClick}
        activeCategoryWeight={activeCategoryWeight}
        onCategoryWeightClick={handleCategoryWeight}
      />
      <OptionChartsCard
        accounts={accounts}
        chartAccountId={chartAccountId}
        liveStocks={allStocks}
        watchlistCoverageItems={watchlistCoverageItems}
        quotesBySymbol={quotesBySymbol}
        quotesByCk={quotesByCk}
        activeOptionDetail={activeOptionDetail}
        onOptionDetailClick={handleOptionDetail}
        activeOptionCategory={optionStockMixFilter}
        onOptionCategoryClick={handleOptionCategory}
      />
    </div>
  )
}
