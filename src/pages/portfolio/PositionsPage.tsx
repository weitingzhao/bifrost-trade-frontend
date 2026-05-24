import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useExecutionsFinal, useExecutionsTws } from '@/hooks/useExecutions'
import { useOpportunities, useStructures } from '@/hooks/useStrategies'
import { deleteExecution } from '@/api/trading'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PositionsFilterBar } from '@/components/positions/PositionsFilterBar'
import { InstanceFilters } from '@/components/positions/InstanceFilters'
import type { InstanceFilterValues } from '@/components/positions/InstanceFilters'
import { StocksTab } from '@/components/positions/StocksTab'
import { FixedIncomeTab } from '@/components/positions/FixedIncomeTab'
import { CashLikeTab } from '@/components/positions/CashLikeTab'
import { OptionsTab } from '@/components/positions/OptionsTab'
import { InstanceTab } from '@/components/positions/InstanceTab'
import { PositionsChartsRow } from '@/components/positions/PositionsChartsRow'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import { LinkExecutionModal } from '@/components/positions/LinkExecutionModal'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import type { InspectorState } from '@/components/positions/InspectorDrawer'
import { buildQuoteMap, uniqueSymbols, uniqueContractKeys } from '@/utils/positions'
import { flattenPositions, splitBySecType, filterStocksByBucket, buildOpenOptionPositions, groupByInstance, positionMatchesAccountFilter } from '@/utils/positionsGrouping'
import { buildStockCoverageItems } from '@/utils/stockCoverage'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'
import { StockCoverageTable } from '@/components/positions/StockCoverageTable'
import type { AccountFilter } from '@/components/positions/PositionsFilterBar'
import type { Execution } from '@/types/positions'

type OpenTab = 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

export default function PositionsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: attrData } = usePositionAttribution()
  const { data: execFinalData } = useExecutionsFinal()
  const { data: execTwsData } = useExecutionsTws()
  const { data: oppsData } = useOpportunities()
  const { data: structsData } = useStructures()

  const [openTab, setOpenTab] = useState<OpenTab>('instance')
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterExpiry, setFilterExpiry] = useState('')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>({ host: true, secondary: true })
  const [instanceFilters, setInstanceFilters] = useState<InstanceFilterValues>({
    structureType: 'all', oppName: 'all', scopeType: 'all', attributionType: 'all',
  })

  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [linkExec, setLinkExec] = useState<Execution | null>(null)
  const [closeExec, setCloseExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [inspector, setInspector] = useState<InspectorState>({ type: null })

  const accounts = data?.portfolio.accounts ?? []
  const hostAccountId = data?.config?.ib_client?.account?.event_host ?? ''
  const secondaryAccountId = data?.config?.ib_client?.account?.event_secondary ?? ''

  const allPositionsRaw = flattenPositions(accounts)
  const allPositions = allPositionsRaw.filter((p) =>
    positionMatchesAccountFilter(p.account_id, accountFilter, hostAccountId, secondaryAccountId)
  )
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

  const executionsFinal = execFinalData?.items ?? []
  const executionsTws = execTwsData?.items ?? []
  const opportunities = oppsData?.items ?? []
  void structsData

  const attributions = attrData?.items ?? []
  const liveOptions = buildOpenOptionPositions(allOptions, attributions)
  const showOffTrack = accountFilter.host && accountFilter.secondary
  const offTrackPositions = showOffTrack ? buildOffTrackPositions(executionsFinal, filterSymbol, filterExpiry) : []
  const openOptions = [...liveOptions, ...offTrackPositions]

  const instanceGroups = groupByInstance(openOptions)

  const filteredInstanceGroups = useMemo(() => {
    let groups = instanceGroups
    if (filterSymbol) {
      const upper = filterSymbol.toUpperCase()
      groups = groups.filter((g) => g.options.some((o) => o.symbol.includes(upper)))
    }
    if (instanceFilters.structureType !== 'all') {
      groups = groups.filter((g) => g.structure_type === instanceFilters.structureType)
    }
    if (instanceFilters.oppName !== 'all') {
      groups = groups.filter((g) => g.strategy_opportunity_name === instanceFilters.oppName)
    }
    if (instanceFilters.scopeType !== 'all') {
      if (instanceFilters.scopeType === '__none__') {
        groups = groups.filter((g) => !g.scope_type)
      } else {
        groups = groups.filter((g) => g.scope_type === instanceFilters.scopeType)
      }
    }
    if (instanceFilters.attributionType !== 'all') {
      groups = groups.filter((g) =>
        g.options.some((o) => o.attribution_type === instanceFilters.attributionType)
      )
    }
    return groups
  }, [instanceGroups, filterSymbol, instanceFilters])

  const instanceFilterOptions = useMemo(() => {
    const structureTypes = [...new Set(instanceGroups.map((g) => g.structure_type).filter(Boolean) as string[])]
    const oppNames = [...new Set(instanceGroups.map((g) => g.strategy_opportunity_name).filter(Boolean) as string[])]
    const scopeTypes = [...new Set(instanceGroups.map((g) => g.scope_type).filter(Boolean) as string[])]
    return { structureTypes, oppNames, scopeTypes }
  }, [instanceGroups])

  const stockCoverageItems = buildStockCoverageItems(instanceGroups, allStocks)
  const accountOptions = [...new Set(accounts.map((a) => a.account_id ?? '').filter(Boolean))]

  const hasInstances = instanceGroups.some((g) => g.strategy_instance_id != null)
  const hasCoreStocks = coreStocks.length > 0
  const hasFixedIncome = fixedIncomeStocks.length > 0
  const hasCashLike = cashLikeStocks.length > 0
  const hasOptions = allOptions.length > 0
  const totalPositions = allPositions.length

  function refreshExecData() {
    queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
    queryClient.invalidateQueries({ queryKey: ['trading', 'position-attribution'] })
  }

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
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Positions</h1>
        {totalPositions > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalPositions} position{totalPositions > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <PositionsChartsRow
        stocks={allStocks}
        options={allOptions}
        totalCash={accounts.reduce((s, a) => s + (parseFloat(a.summary?.TotalCashValue ?? '0') || 0), 0)}
        activeSymbol={filterSymbol}
        onSymbolClick={(sym) => setFilterSymbol(sym ?? '')}
        onOptionClick={(sym) => { setFilterSymbol(sym ?? ''); if (sym) setOpenTab('options') }}
        onCategoryClick={(cat) => setOpenTab(cat)}
      />

      <PositionsFilterBar
        filterSymbol={filterSymbol}
        onFilterSymbolChange={setFilterSymbol}
        filterExpiry={filterExpiry}
        onFilterExpiryChange={setFilterExpiry}
        hostAccountId={hostAccountId}
        secondaryAccountId={secondaryAccountId}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
      />

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
            <TabsTrigger value="instance" disabled={!hasInstances && !hasOptions}>Strategy</TabsTrigger>
            <TabsTrigger value="options" disabled={!hasOptions}>Options</TabsTrigger>
            <TabsTrigger value="stocks" disabled={!hasCoreStocks}>Stocks</TabsTrigger>
            <TabsTrigger value="fixed_income" disabled={!hasFixedIncome}>Fixed Income</TabsTrigger>
            <TabsTrigger value="cash_like" disabled={!hasCashLike}>Cash-like</TabsTrigger>
          </TabsList>

          <TabsContent value="instance" className="mt-4">
            <InstanceFilters
              structureTypes={instanceFilterOptions.structureTypes}
              oppNames={instanceFilterOptions.oppNames}
              scopeTypes={instanceFilterOptions.scopeTypes}
              values={instanceFilters}
              onChange={setInstanceFilters}
            />
            <InstanceTab
              groups={filteredInstanceGroups}
              quotesBySymbol={quotesBySymbol}
              benchBySymbol={benchBySymbol}
              liveStocks={allStocks}
              executionsFinal={executionsFinal}
              executionsTws={executionsTws}
              opportunities={opportunities}
              onEditExec={setEditExec}
              onLinkExec={setLinkExec}
              onDeleteExec={setDeleteTarget}
              onRefreshExecs={refreshExecData}
              onOpenStrategy={(id) => setInspector({ type: 'strategy', id })}
              onOpenStock={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
              onOpenOption={(contractKey) => setInspector({ type: 'option', contractKey })}
            />
          </TabsContent>

          <TabsContent value="options" className="mt-4">
            <OptionsTab
              positions={openOptions}
              quotesBySymbol={quotesBySymbol}
              filterSymbol={filterSymbol}
              filterExpiry={filterExpiry}
              executionsFinal={executionsFinal}
              executionsTws={executionsTws}
              onEditExec={setEditExec}
              onLinkExec={setLinkExec}
              onDeleteExec={setDeleteTarget}
              onCloseExec={setCloseExec}
              onRefreshExecs={refreshExecData}
            />
          </TabsContent>

          <TabsContent value="stocks" className="mt-4">
            <StocksTab positions={coreStocks} quotesBySymbol={quotesBySymbol} benchBySymbol={benchBySymbol} filterSymbol={filterSymbol} />
          </TabsContent>

          <TabsContent value="fixed_income" className="mt-4">
            <FixedIncomeTab positions={fixedIncomeStocks} quotesBySymbol={quotesBySymbol} benchBySymbol={benchBySymbol} filterSymbol={filterSymbol} />
          </TabsContent>

          <TabsContent value="cash_like" className="mt-4">
            <CashLikeTab positions={cashLikeStocks} quotesBySymbol={quotesBySymbol} benchBySymbol={benchBySymbol} filterSymbol={filterSymbol} />
          </TabsContent>
        </Tabs>
      )}

      {stockCoverageItems.length > 0 && <StockCoverageTable items={stockCoverageItems} />}

      <ExecutionFormModal open={!!editExec} exec={editExec} accountOptions={accountOptions} onClose={() => setEditExec(null)} onSuccess={refreshExecData} />
      <LinkExecutionModal open={!!linkExec} exec={linkExec} opportunities={opportunities} onClose={() => setLinkExec(null)} onSuccess={refreshExecData} />
      <QuickCloseModal exec={closeExec} onClose={() => setCloseExec(null)} onSuccess={refreshExecData} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete execution"
        message="This will permanently remove this execution from the trade ledger. This cannot be undone."
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget?.account_executions_id != null) {
            await deleteExecution(deleteTarget.account_executions_id)
            refreshExecData()
          }
        }}
      />
      <InspectorDrawer state={inspector} onClose={() => setInspector({ type: null })} />
    </div>
  )
}
