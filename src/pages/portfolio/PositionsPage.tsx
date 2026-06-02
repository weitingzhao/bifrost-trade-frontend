import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useExecutionsFinal, useExecutionsTws } from '@/hooks/useExecutions'
import { useOpportunities, useStructures } from '@/hooks/useStrategies'
import { deleteExecution } from '@/api/trading'
import { PageHeader, PageShell } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { InstanceFilters } from '@/components/positions/InstanceFilters'
import type { InstanceFilterValues } from '@/components/positions/InstanceFilters'
import { StocksTab } from '@/components/positions/StocksTab'
import { FixedIncomeTab } from '@/components/positions/FixedIncomeTab'
import { CashLikeTab } from '@/components/positions/CashLikeTab'
import { OptionsTab } from '@/components/positions/OptionsTab'
import { InstanceTab } from '@/components/positions/InstanceTab'
import { PositionsChartsSection, type OpenTab } from '@/components/positions/PositionsChartsSection'
import { PositionsOpenControls, type DetailViewMode } from '@/components/positions/PositionsOpenControls'
import { EditExecutionConfirmDialog } from '@/components/positions/EditExecutionConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import {
  LinkExecutionModal,
  type LinkExecutionContext,
} from '@/components/positions/LinkExecutionModal'
import { collectPeerInstancePicks } from '@/utils/ledger/ledgerOptHelpers'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import type { InspectorState } from '@/components/positions/InspectorDrawer'
import { OptionContractDrawer } from '@/components/optionDiscovery/OptionContractDrawer'
import { OptionContractDetailFromOpenPosition } from '@/components/optionDiscovery/OptionContractDetailFromOpenPosition'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import { buildQuoteMap, buildCkMap, uniqueSymbols, uniqueContractKeys } from '@/utils/positions'
import {
  flattenPositions,
  splitBySecType,
  filterStocksByBucket,
  buildOpenOptionPositions,
  positionMatchesAccountFilter,
} from '@/utils/positionsGrouping'
import { buildStockCoverageItems } from '@/utils/stockCoverage'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'
import { buildInstanceAllGroups } from '@/utils/buildInstanceAllGroups'
import { buildInstanceGroups } from '@/utils/buildInstanceGroups'
import { filterInstanceGroups } from '@/utils/filterInstanceGroups'
import { sortInstanceGroupOptions } from '@/utils/instanceGroupSort'
import { buildOptionStockMix, liveStockRowCovKey, type OptionStockMixCategory } from '@/utils/positionsCharts'
import { CoverageSummarySection } from '@/components/positions/CoverageSummarySection'
import { IndependentHoldingsSection } from '@/components/positions/IndependentHoldingsSection'
import type { AccountFilter } from '@/components/positions/PositionsFilterBar'
import type { Execution } from '@/types/positions'

function optionExpiryMatchesFilter(expiryRaw: string, filterRaw: string): boolean {
  const f = filterRaw.replace(/\D/g, '')
  if (!f) return true
  const ex = (expiryRaw ?? '').replace(/\D/g, '')
  if (!ex) return false
  if (ex.length >= f.length) return ex.startsWith(f)
  return f.startsWith(ex)
}

export default function PositionsPage() {
  const navigate = useNavigate()
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
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('accordion')
  const [optionStockMixFilter, setOptionStockMixFilter] = useState<OptionStockMixCategory | null>(null)
  const [chartAccountId, setChartAccountId] = useState('all')
  const [instanceFilters, setInstanceFilters] = useState<InstanceFilterValues>({
    structureType: 'all',
    oppName: 'all',
    scopeType: 'all',
    attributionType: 'all',
  })

  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [editExecConfirm, setEditExecConfirm] = useState<{ open: boolean; exec: Execution | null }>({
    open: false,
    exec: null,
  })
  const [linkContext, setLinkContext] = useState<LinkExecutionContext | null>(null)
  const [closeExec, setCloseExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [inspector, setInspector] = useState<InspectorState>({ type: null })
  const closeInspector = () => setInspector({ type: null })

  const accounts = useMemo(() => data?.portfolio.accounts ?? [], [data])
  const hostAccountId = data?.config?.ib_client?.account?.event_host ?? ''
  const secondaryAccountId = data?.config?.ib_client?.account?.event_secondary ?? ''

  const allPositions = useMemo(
    () =>
      flattenPositions(accounts).filter((p) =>
        positionMatchesAccountFilter(p.account_id, accountFilter, hostAccountId, secondaryAccountId),
      ),
    [accounts, accountFilter, hostAccountId, secondaryAccountId],
  )
  const { stocks: allStocks, options: allOptions } = useMemo(
    () => splitBySecType(allPositions),
    [allPositions],
  )

  const stkSymbols = uniqueSymbols(accounts)
  const optCks = uniqueContractKeys(accounts)
  const { data: quotesData } = useQuotes(stkSymbols, optCks)
  const { data: benchData } = useBenchmarks(stkSymbols)

  const quotesBySymbol = buildQuoteMap(quotesData)
  const quotesByCk = buildCkMap(quotesData)
  const benchBySymbol = useMemo(
    () => benchData?.benchmarks ?? {},
    [benchData?.benchmarks],
  )

  const openOptionPosition =
    inspector.type === 'option' ? inspector.optionPosition : undefined
  const openOptionQuote = openOptionPosition
    ? quotesByCk[openOptionPosition.contract_key]
    : undefined
  const openOptionUnderlyingHint = useMemo(() => {
    if (!openOptionPosition) return null
    const sym = (openOptionPosition.symbol ?? '').trim().toUpperCase()
    const bench = benchBySymbol[sym]
    if (bench?.close != null && Number.isFinite(bench.close)) return bench.close
    const q = quotesBySymbol[sym]
    if (q?.last != null && Number.isFinite(q.last)) return q.last
    if (q?.mid != null && Number.isFinite(q.mid)) return q.mid
    return null
  }, [openOptionPosition, benchBySymbol, quotesBySymbol])

  const inspectorDrawerState: InspectorState =
    inspector.type === 'option' ? { type: null } : inspector

  const coreStocks = filterStocksByBucket(allStocks, 'core')
  const fixedIncomeStocks = filterStocksByBucket(allStocks, 'fixed_income')
  const cashLikeStocks = filterStocksByBucket(allStocks, 'cash_like')

  const executionsFinal = useMemo(() => execFinalData?.items ?? [], [execFinalData])
  const executionsTws = useMemo(() => execTwsData?.items ?? [], [execTwsData?.items])
  const opportunities = useMemo(() => oppsData?.items ?? [], [oppsData?.items])
  const structures = useMemo(() => structsData?.items ?? [], [structsData?.items])
  const attributions = useMemo(() => attrData?.items ?? [], [attrData])

  const liveOptions = useMemo(
    () => buildOpenOptionPositions(allOptions, attributions),
    [allOptions, attributions],
  )
  const showOffTrack = accountFilter.host && accountFilter.secondary
  const offTrackPositions = useMemo(
    () => (showOffTrack ? buildOffTrackPositions(executionsFinal, filterSymbol, filterExpiry) : []),
    [showOffTrack, executionsFinal, filterSymbol, filterExpiry],
  )
  const openOptions = useMemo(
    () => [...liveOptions, ...offTrackPositions],
    [liveOptions, offTrackPositions],
  )

  const baseInstanceGroups = useMemo(
    () =>
      buildInstanceGroups({
        attributions,
        liveOptions: allOptions,
        accountFilter,
        hostAccountId,
        secondaryAccountId,
        filterSymbol,
        filterExpiry,
        showOffTrack,
        executionsFinal,
      }),
    [
      attributions,
      allOptions,
      accountFilter,
      hostAccountId,
      secondaryAccountId,
      filterSymbol,
      filterExpiry,
      showOffTrack,
      executionsFinal,
    ],
  )

  const instanceAllGroups = useMemo(
    () =>
      buildInstanceAllGroups({
        instanceGroups: baseInstanceGroups,
        attributions,
        executionsFinal,
        executionsTws,
        opportunities,
        structures,
        liveStocks: allStocks,
      }),
    [
      baseInstanceGroups,
      attributions,
      executionsFinal,
      executionsTws,
      opportunities,
      structures,
      allStocks,
    ],
  )

  const filteredInstanceGroups = useMemo(
    () =>
      sortInstanceGroupOptions(
        filterInstanceGroups({
          groups: instanceAllGroups,
          filterSymbol,
          filters: instanceFilters,
        }),
      ),
    [instanceAllGroups, filterSymbol, instanceFilters],
  )

  const instanceFilterOptions = useMemo(() => {
    const structureTypes = [
      ...new Set(instanceAllGroups.map((g) => g.structure_type).filter(Boolean) as string[]),
    ]
    const oppNames = [
      ...new Set(instanceAllGroups.map((g) => g.strategy_opportunity_name).filter(Boolean) as string[]),
    ]
    const scopeTypes = [
      ...new Set(instanceAllGroups.map((g) => g.scope_type).filter(Boolean) as string[]),
    ]
    return { structureTypes, oppNames, scopeTypes }
  }, [instanceAllGroups])

  const stockCoverageItems = useMemo(
    () => buildStockCoverageItems(instanceAllGroups, allStocks),
    [instanceAllGroups, allStocks],
  )

  const watchlistCoverageItems = useMemo(
    () => stockCoverageItems.filter((i) => i.optionable_supported !== false),
    [stockCoverageItems],
  )

  const accountOptions = [...new Set(accounts.map((a) => a.account_id ?? '').filter(Boolean))]

  const optionStockMixKeys = useMemo(
    () => buildOptionStockMix(allStocks, watchlistCoverageItems, 'all'),
    [allStocks, watchlistCoverageItems],
  )

  const filteredCoreStocks = useMemo(() => {
    let list = coreStocks
    const sym = filterSymbol.trim().toUpperCase()
    if (sym) list = list.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
    if (!optionStockMixFilter) return list
    if (optionStockMixFilter === 'Cash-like') return []
    if (optionStockMixFilter === 'Backing Pool') {
      return list.filter((p) => optionStockMixKeys.backingKeys.has(liveStockRowCovKey(p)))
    }
    return list.filter((p) => optionStockMixKeys.otherKeys.has(liveStockRowCovKey(p)))
  }, [coreStocks, filterSymbol, optionStockMixFilter, optionStockMixKeys])

  const filteredFixedIncomeStocks = useMemo(() => {
    const sym = filterSymbol.trim().toUpperCase()
    if (!sym) return fixedIncomeStocks
    return fixedIncomeStocks.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
  }, [fixedIncomeStocks, filterSymbol])

  const filteredCashLikeStocks = useMemo(() => {
    const sym = filterSymbol.trim().toUpperCase()
    if (!sym) return cashLikeStocks
    return cashLikeStocks.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
  }, [cashLikeStocks, filterSymbol])

  const stocksTabEmptyHint = useMemo(() => {
    if (
      optionStockMixFilter &&
      filteredCoreStocks.length === 0 &&
      coreStocks.length > 0
    ) {
      return `No stock positions match the ${optionStockMixFilter} filter from the chart. Clear the filter or pick another slice.`
    }
    return 'No open stock positions under the current filters.'
  }, [optionStockMixFilter, filteredCoreStocks.length, coreStocks.length])

  const fixedIncomeTabEmptyHint = useMemo(() => {
    if (filterSymbol.trim() && filteredFixedIncomeStocks.length === 0 && fixedIncomeStocks.length > 0) {
      return 'No fixed income positions match the current symbol filter.'
    }
    return 'No open fixed income positions under the current filters.'
  }, [filterSymbol, filteredFixedIncomeStocks.length, fixedIncomeStocks.length])

  const filteredOptions = useMemo(() => {
    let list = openOptions
    const sym = filterSymbol.trim().toUpperCase()
    if (sym) list = list.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
    const exp = filterExpiry.trim()
    if (exp) list = list.filter((p) => optionExpiryMatchesFilter(p.expiry, exp))
    return list
  }, [openOptions, filterSymbol, filterExpiry])

  const hasInstances = instanceAllGroups.some((g) => g.strategy_instance_id != null)
  const hasCoreStocks = coreStocks.length > 0
  const hasFixedIncome = fixedIncomeStocks.length > 0
  const hasCashLike = cashLikeStocks.length > 0
  const hasOptions = allOptions.length > 0 || offTrackPositions.length > 0
  const totalPositions = allPositions.length
  const portfolioPositionCount = useMemo(() => flattenPositions(accounts).length, [accounts])
  const hasAccountSelection =
    (!hostAccountId && !secondaryAccountId) || accountFilter.host || accountFilter.secondary
  const showOpenPositionsPanel = accounts.length > 0

  function refreshExecData() {
    queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
    queryClient.invalidateQueries({ queryKey: ['trading', 'position-attribution'] })
  }

  function requestEditExec(ex: Execution) {
    setEditExecConfirm({ open: true, exec: ex })
  }

  function openLinkExec(ex: Execution, sameContractTrades?: Execution[]) {
    const execId = ex.account_executions_id
    if (execId == null) return
    const peerPicks =
      sameContractTrades?.length && sameContractTrades.length > 0
        ? collectPeerInstancePicks(sameContractTrades, execId)
        : []
    setLinkContext({
      account_executions_id: execId,
      execution: ex,
      ...(peerPicks.length > 0 ? { peer_instance_picks: peerPicks } : {}),
    })
  }

  if (isLoading) {
    return (
      <PageShell className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-6">
      <PageHeader
        title="Positions"
        description="Open positions (Pool On and Off) and manual execution records."
        actions={
          portfolioPositionCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {hasAccountSelection ? totalPositions : 0} position
              {hasAccountSelection && totalPositions !== 1 ? 's' : ''}
              {!hasAccountSelection ? ' (select account)' : ''}
            </Badge>
          ) : undefined
        }
      />

      <PositionsChartsSection
        accounts={accounts}
        allStocks={allStocks}
        hostAccountId={hostAccountId}
        secondaryAccountId={secondaryAccountId}
        quotesBySymbol={quotesBySymbol}
        quotesByCk={quotesByCk}
        watchlistCoverageItems={watchlistCoverageItems}
        chartAccountId={chartAccountId}
        onChartAccountIdChange={setChartAccountId}
        filterSymbol={filterSymbol}
        onFilterSymbolChange={setFilterSymbol}
        onTabChange={setOpenTab}
        optionStockMixFilter={optionStockMixFilter}
        onOptionStockMixFilterChange={setOptionStockMixFilter}
      />

      {!showOpenPositionsPanel ? (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
          <p className="text-sm font-medium">No open positions</p>
          <p className="text-xs text-muted-foreground">
            Position data comes from account snapshots. Ensure IB is connected and Account Sync is running.
          </p>
        </div>
      ) : (
        <Tabs value={openTab} onValueChange={(v) => setOpenTab(v as OpenTab)}>
          <PositionsOpenControls
            filterSymbol={filterSymbol}
            onFilterSymbolChange={setFilterSymbol}
            filterExpiry={filterExpiry}
            onFilterExpiryChange={setFilterExpiry}
            hostAccountId={hostAccountId}
            secondaryAccountId={secondaryAccountId}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            detailViewMode={detailViewMode}
            onDetailViewModeChange={setDetailViewMode}
            hasInstances={hasInstances}
            hasOptions={hasOptions}
            hasCoreStocks={hasCoreStocks}
            hasFixedIncome={hasFixedIncome}
            hasCashLike={hasCashLike}
            showPositionTabs={portfolioPositionCount > 0}
          />

          <div className="min-w-0 w-full">
            {!hasAccountSelection ? (
              <div className="mt-3 rounded-lg border border-dashed p-6 text-center space-y-1">
                <p className="text-sm font-medium">Select an account</p>
                <p className="text-xs text-muted-foreground">
                  Turn on HOST and/or Secondary above to show open positions for those accounts.
                </p>
              </div>
            ) : totalPositions === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed p-6 text-center space-y-1">
                <p className="text-sm font-medium">No positions match filters</p>
                <p className="text-xs text-muted-foreground">
                  No open positions under the current symbol, expiry, or account filters. Off-track options
                  appear when both HOST and Secondary are enabled.
                </p>
              </div>
            ) : (
              <>
              <TabsContent value="instance" className="mt-3 outline-none">
                <InstanceFilters
                  structureTypes={instanceFilterOptions.structureTypes}
                  oppNames={instanceFilterOptions.oppNames}
                  scopeTypes={instanceFilterOptions.scopeTypes}
                  values={instanceFilters}
                  onChange={setInstanceFilters}
                />
                <InstanceTab
                  groups={filteredInstanceGroups}
                  totalInstanceCount={instanceAllGroups.length}
                  quotesBySymbol={quotesBySymbol}
                  quotesByCk={quotesByCk}
                  benchBySymbol={benchBySymbol}
                  liveStocks={allStocks}
                  executionsFinal={executionsFinal}
                  executionsTws={executionsTws}
                  opportunities={opportunities}
                  detailViewMode={detailViewMode}
                  onEditExec={requestEditExec}
                  onLinkExec={openLinkExec}
                  onDeleteExec={setDeleteTarget}
                  onRefreshExecs={refreshExecData}
                  onOpenStrategy={(id) => setInspector({ type: 'strategy', id })}
                  onOpenStock={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
                  onOpenOption={(pos) =>
                    setInspector({
                      type: 'option',
                      contractKey: pos.contract_key,
                      optionPosition: pos,
                    })
                  }
                />
                <CoverageSummarySection
                  instanceGroups={filteredInstanceGroups}
                  stockCoverageItems={stockCoverageItems}
                  chartAccountId={chartAccountId}
                  hostAccountId={hostAccountId}
                  secondaryAccountId={secondaryAccountId}
                  accounts={accounts}
                  onInspectSymbol={(symbol, accountId) =>
                    setInspector({ type: 'stock', symbol, accountId })
                  }
                />
                <IndependentHoldingsSection
                  coreStocks={coreStocks}
                  fixedIncomeStocks={fixedIncomeStocks}
                  cashLikeStocks={cashLikeStocks}
                  filterSymbol={filterSymbol}
                  onInspectStock={(pos) =>
                    setInspector({
                      type: 'stock',
                      symbol: (pos.symbol ?? '').toUpperCase(),
                      accountId: pos.account_id,
                      livePosition: pos,
                    })
                  }
                />
              </TabsContent>

              <TabsContent value="options" className="mt-3 outline-none">
                <OptionsTab
                  positions={filteredOptions}
                  quotesBySymbol={quotesBySymbol}
                  quotesByCk={quotesByCk}
                  filterSymbol={filterSymbol}
                  filterExpiry={filterExpiry}
                  executionsFinal={executionsFinal}
                  executionsTws={executionsTws}
                  detailViewMode={detailViewMode}
                  onEditExec={requestEditExec}
                  onLinkExec={openLinkExec}
                  onDeleteExec={setDeleteTarget}
                  onCloseExec={setCloseExec}
                  onInspect={(pos) =>
                    setInspector({
                      type: 'option',
                      contractKey: pos.contract_key,
                      optionPosition: pos,
                    })
                  }
                  onOpenStrategy={(id) => setInspector({ type: 'strategy', id })}
                />
              </TabsContent>

              <TabsContent value="stocks" className="mt-3 outline-none">
                <StocksTab
                  positions={filteredCoreStocks}
                  title="Stock positions"
                  emptyHint={stocksTabEmptyHint}
                  filterSymbol={filterSymbol}
                  onInspect={(symbol, accountId, pos) =>
                    setInspector({ type: 'stock', symbol, accountId, livePosition: pos })
                  }
                />
              </TabsContent>

              <TabsContent value="fixed_income" className="mt-3 outline-none">
                <FixedIncomeTab
                  positions={filteredFixedIncomeStocks}
                  emptyHint={fixedIncomeTabEmptyHint}
                  filterSymbol={filterSymbol}
                  onInspect={(symbol, accountId, pos) =>
                    setInspector({ type: 'stock', symbol, accountId, livePosition: pos })
                  }
                />
              </TabsContent>

              <TabsContent value="cash_like" className="mt-3 outline-none">
                <CashLikeTab
                  positions={filteredCashLikeStocks}
                  filterSymbol={filterSymbol}
                  onInspect={(symbol, accountId, pos) =>
                    setInspector({ type: 'stock', symbol, accountId, livePosition: pos })
                  }
                />
              </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      )}

      <EditExecutionConfirmDialog
        open={editExecConfirm.open}
        onCancel={() => setEditExecConfirm({ open: false, exec: null })}
        onContinue={() => {
          const ex = editExecConfirm.exec
          setEditExecConfirm({ open: false, exec: null })
          if (ex) setEditExec(ex)
        }}
      />
      <ExecutionFormModal
        key={editExec?.account_executions_id ?? 'exec-form'}
        open={!!editExec}
        exec={editExec}
        accountOptions={accountOptions}
        onClose={() => setEditExec(null)}
        onSuccess={refreshExecData}
      />
      <LinkExecutionModal
        key={linkContext?.account_executions_id ?? 'link-form'}
        open={!!linkContext}
        context={linkContext}
        opportunities={opportunities}
        onClose={() => setLinkContext(null)}
        onSuccess={refreshExecData}
      />
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
      <InspectorDrawer state={inspectorDrawerState} onClose={closeInspector} />

      <OptionContractDrawer open={Boolean(openOptionPosition)}>
        {openOptionPosition ? (
          <OptionContractDetailFromOpenPosition
            position={openOptionPosition}
            optionQuote={openOptionQuote}
            underlyingHint={openOptionUnderlyingHint}
            onClose={closeInspector}
            onOpenOptionDiscovery={() => {
              navigate(buildDiscoveryUrl(openOptionPosition.symbol, openOptionPosition.expiry))
              closeInspector()
            }}
          />
        ) : null}
      </OptionContractDrawer>
    </PageShell>
  )
}
