import { useState } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PositionsFilterBar } from '@/components/positions/PositionsFilterBar'
import { StocksTab } from '@/components/positions/StocksTab'
import { FixedIncomeTab } from '@/components/positions/FixedIncomeTab'
import { CashLikeTab } from '@/components/positions/CashLikeTab'
import { OptionsTab } from '@/components/positions/OptionsTab'
import { InstanceTab } from '@/components/positions/InstanceTab'
import { PositionsChartsRow } from '@/components/positions/PositionsChartsRow'
import { buildQuoteMap, uniqueSymbols, uniqueContractKeys } from '@/utils/positions'
import { flattenPositions, splitBySecType, filterStocksByBucket, buildOpenOptionPositions, groupByInstance } from '@/utils/positionsGrouping'

type OpenTab = 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

export default function PositionsPage() {
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: attrData } = usePositionAttribution()
  const [openTab, setOpenTab] = useState<OpenTab>('instance')
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterExpiry, setFilterExpiry] = useState('')

  const accounts = data?.portfolio.accounts ?? []
  const allPositions = flattenPositions(accounts)
  const { stocks: allStocks, options: allOptions } = splitBySecType(allPositions)

  const stkSymbols = uniqueSymbols(accounts)
  const optCks = uniqueContractKeys(accounts)
  const { data: quotesData } = useQuotes(stkSymbols, optCks)
  const { data: benchData } = useBenchmarks(stkSymbols)

  const quotesBySymbol = buildQuoteMap(quotesData)
  const benchBySymbol = benchData?.benchmarks ?? {}

  const coreStocks = filterStocksByBucket(allStocks, 'core')
  const fixedIncomeStocks = filterStocksByBucket(allStocks, 'fixed_income')
  const cashLikeStocks = filterStocksByBucket(allStocks, 'cash_like')

  const attributions = attrData?.items ?? []
  const openOptions = buildOpenOptionPositions(allOptions, attributions)
  const instanceGroups = groupByInstance(openOptions)

  const hasInstances = instanceGroups.some((g) => g.strategy_instance_id != null)
  const hasCoreStocks = coreStocks.length > 0
  const hasFixedIncome = fixedIncomeStocks.length > 0
  const hasCashLike = cashLikeStocks.length > 0
  const hasOptions = allOptions.length > 0

  const totalPositions = allPositions.length

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Positions</h1>
        {totalPositions > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalPositions} position{totalPositions > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Charts row */}
      <PositionsChartsRow
        stocks={allStocks}
        options={allOptions}
        totalCash={accounts.reduce((s, a) => s + (parseFloat(a.summary?.TotalCashValue ?? '0') || 0), 0)}
      />

      {/* Filter Bar */}
      <PositionsFilterBar
        filterSymbol={filterSymbol}
        onFilterSymbolChange={setFilterSymbol}
        filterExpiry={filterExpiry}
        onFilterExpiryChange={setFilterExpiry}
      />

      {/* Tab Content */}
      {totalPositions === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
          <p className="text-sm font-medium">No open positions</p>
          <p className="text-xs text-muted-foreground">
            Position data comes from account snapshots. Ensure IB is connected and Account Sync is running.
          </p>
        </div>
      ) : (
        <Tabs value={openTab} onValueChange={(v) => setOpenTab(v as OpenTab)}>
          <TabsList>
            <TabsTrigger value="instance" disabled={!hasInstances && !hasOptions}>
              Strategy
            </TabsTrigger>
            <TabsTrigger value="options" disabled={!hasOptions}>
              Options
            </TabsTrigger>
            <TabsTrigger value="stocks" disabled={!hasCoreStocks}>
              Stocks
            </TabsTrigger>
            <TabsTrigger value="fixed_income" disabled={!hasFixedIncome}>
              Fixed Income
            </TabsTrigger>
            <TabsTrigger value="cash_like" disabled={!hasCashLike}>
              Cash-like
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instance" className="mt-4">
            <InstanceTab
              groups={instanceGroups}
              quotesBySymbol={quotesBySymbol}
              filterSymbol={filterSymbol}
            />
          </TabsContent>

          <TabsContent value="options" className="mt-4">
            <OptionsTab
              positions={openOptions}
              quotesBySymbol={quotesBySymbol}
              filterSymbol={filterSymbol}
              filterExpiry={filterExpiry}
            />
          </TabsContent>

          <TabsContent value="stocks" className="mt-4">
            <StocksTab
              positions={coreStocks}
              quotesBySymbol={quotesBySymbol}
              benchBySymbol={benchBySymbol}
              filterSymbol={filterSymbol}
            />
          </TabsContent>

          <TabsContent value="fixed_income" className="mt-4">
            <FixedIncomeTab
              positions={fixedIncomeStocks}
              quotesBySymbol={quotesBySymbol}
              benchBySymbol={benchBySymbol}
              filterSymbol={filterSymbol}
            />
          </TabsContent>

          <TabsContent value="cash_like" className="mt-4">
            <CashLikeTab
              positions={cashLikeStocks}
              quotesBySymbol={quotesBySymbol}
              benchBySymbol={benchBySymbol}
              filterSymbol={filterSymbol}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
