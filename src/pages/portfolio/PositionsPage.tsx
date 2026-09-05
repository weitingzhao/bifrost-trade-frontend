import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuotes } from '@/hooks/useQuotes'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useExecutionsFinal, useExecutionsTws, useExecutionsCanonical } from '@/hooks/useExecutions'
import { useOpportunities, useStructures, useStrategyInstances } from '@/hooks/useStrategies'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { deleteExecution } from '@/api/trading'
import { PageHeader, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/data-display'
import {
  LinesToolbar,
  CLEAR_FILTERS,
  type InstanceFilterValues,
  type LinesView,
  type DetailViewMode,
} from '@/components/positions/LinesToolbar'
import { OptionsTab } from '@/components/positions/OptionsTab'
import { InstanceTab } from '@/components/positions/InstanceTab'
import { PositionsDashboard, type BackingSegmentTarget } from '@/components/positions/PositionsDashboard'
import { PositionsOpenControls, type AccountFilter } from '@/components/positions/PositionsOpenControls'
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
import {
  buildQuoteMap,
  buildCkMap,
  uniqueSymbols,
  uniqueContractKeys,
  uniqueOptionUnderlyings,
} from '@/utils/positions'
import {
  flattenPositions,
  splitBySecType,
  filterStocksByBucket,
  buildOpenOptionPositions,
  positionMatchesAccountFilter,
} from '@/utils/positionsGrouping'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'
import { buildInstanceAllGroups } from '@/utils/buildInstanceAllGroups'
import { buildCanonicalOptContractKeySet } from '@/utils/execAttributionSync'
import { buildInstanceGroups } from '@/utils/buildInstanceGroups'
import { filterInstanceGroups } from '@/utils/filterInstanceGroups'
import { sortInstanceGroupOptions } from '@/utils/instanceGroupSort'
import { BookVsBaseCockpit } from '@/components/positions/BookVsBaseCockpit'
import { MarginByAccountStrip } from '@/components/positions/MarginByAccountStrip'
import { ObligationsRoomSection } from '@/components/positions/ObligationsRoomSection'
import { BaseHoldingsSection } from '@/components/positions/BaseHoldingsSection'
import { usePositionsAlarm, type AlarmTarget } from '@/hooks/usePositionsAlarm'
import { usePositionsSections, type PositionsSectionId } from '@/hooks/usePositionsSections'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { extractUnderlyingRootSymbol } from '@/components/positions/linkExecutionModalHelpers'
import { ExpiryLadderSection } from '@/components/positions/ExpiryLadderSection'
import { UnderlyingRiskSection } from '@/components/positions/UnderlyingRiskSection'
import { coverByAccountSymbol } from '@/utils/bookVsBase'
import { buildObligationsRows } from '@/utils/obligationsRows'
import { sortObligations, type ObligationsSort } from '@/utils/obligationsRoom'
import { buildRiskMapLegs, type RiskMapLeg } from '@/utils/shortLegRiskMap'
import { ShortLegsPanel } from '@/components/positions/ShortLegsPanel'
import type { Execution } from '@/types/positions'

function optionExpiryMatchesFilter(expiryRaw: string, filterRaw: string): boolean {
  const f = filterRaw.replace(/\D/g, '')
  if (!f) return true
  const ex = (expiryRaw ?? '').replace(/\D/g, '')
  if (!ex) return false
  if (ex.length >= f.length) return ex.startsWith(f)
  return f.startsWith(ex)
}

const SECTION_IDS: ReadonlySet<string> = new Set<PositionsSectionId>([
  'charts',
  'ladder',
  'capital',
  'coverage',
  'independent',
])

/** Anchors for the two targets that are places on the page rather than sections. */
const ANCHOR_IDS: Record<'margin' | 'lines', string> = {
  margin: 'positions-margin',
  lines: 'positions-lines',
}

export default function PositionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: attrData } = usePositionAttribution()
  const { data: execFinalData } = useExecutionsFinal()
  const { data: execTwsData } = useExecutionsTws()
  const { data: execCanonicalData } = useExecutionsCanonical()
  const { data: oppsData } = useOpportunities()
  const { data: structsData } = useStructures()
  const { data: instancesData } = useStrategyInstances()

  // Scope: the one set of choices the whole page is about.
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterExpiry, setFilterExpiry] = useState('')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>({ host: true, secondary: true })
  const { pct: cushionTightPct, setPct: setCushionTightPct } = useCushionThreshold()
  // Section open/closed is the reader's call and is remembered between visits.
  const { open: openSections, toggle: toggleSection, openSection } = usePositionsSections()

  // Grid-only state: changes what the grid shows, never what the cockpit grades.
  const [linesView, setLinesView] = useState<LinesView>('strategy')
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('accordion')
  const [instanceFilters, setInstanceFilters] = useState<InstanceFilterValues>(CLEAR_FILTERS)
  const [obligationsSort, setObligationsSort] = useState<ObligationsSort>('cash')

  const openTarget = useCallback(
    (t: AlarmTarget, sort?: ObligationsSort) => {
      if (sort) setObligationsSort(sort)
      if (SECTION_IDS.has(t)) openSection(t as PositionsSectionId)
      const id = t === 'margin' || t === 'lines' ? ANCHOR_IDS[t] : `positions-section-${t}`
      // The section is what holds the detail; the chip only says which to read.
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'nearest' })
      })
    },
    [openSection],
  )

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
  /** Model-analysis is per account; follow the same Host / Secondary toggles the tables do. */
  const modelAnalysisAccountIds = [
    accountFilter.host ? hostAccountId : '',
    accountFilter.secondary ? secondaryAccountId : '',
  ].filter(Boolean)
  const scopedAccounts = useMemo(
    () =>
      accounts.filter((a) =>
        positionMatchesAccountFilter(a.account_id ?? '', accountFilter, hostAccountId, secondaryAccountId),
      ),
    [accounts, accountFilter, hostAccountId, secondaryAccountId],
  )

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

  // Include the underlyings of held options, not just held stock: a short put
  // on a symbol with no share position still needs a spot to be measured against.
  const stkSymbols = [
    ...new Set([...uniqueSymbols(accounts), ...uniqueOptionUnderlyings(accounts)]),
  ]
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
  const canonicalOptContractKeys = useMemo(
    () => buildCanonicalOptContractKeySet(execCanonicalData?.items ?? []),
    [execCanonicalData],
  )
  const opportunities = useMemo(() => oppsData?.items ?? [], [oppsData?.items])
  const structures = useMemo(() => structsData?.items ?? [], [structsData?.items])
  const attributions = useMemo(() => attrData?.items ?? [], [attrData])
  const instanceStructureById = useMemo(() => {
    const map = new Map<number, number | null | undefined>()
    for (const inst of instancesData?.items ?? []) {
      map.set(inst.strategy_instance_id, inst.strategy_structure_id)
    }
    return map
  }, [instancesData?.items])

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

  // Two instance sets, one rule: the scope bar (accounts, symbol, expiry) is in
  // both; the grid's own filters are only in the second. The cockpit, the
  // dashboard, the ladder and the obligations read the first, so choosing a
  // contract type in the toolbar never re-grades the book above it.
  const scopedInstanceGroups = useMemo(
    () => sortInstanceGroupOptions(instanceAllGroups),
    [instanceAllGroups],
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

  const openStrategyInspector = useCallback((id: number) => {
    setInspector({ type: 'strategy', id })
  }, [])

  const accountOptions = [...new Set(accounts.map((a) => a.account_id ?? '').filter(Boolean))]

  const filteredOptions = useMemo(() => {
    let list = openOptions
    const sym = filterSymbol.trim().toUpperCase()
    if (sym) list = list.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
    const exp = filterExpiry.trim()
    if (exp) list = list.filter((p) => optionExpiryMatchesFilter(p.expiry, exp))
    return list
  }, [openOptions, filterSymbol, filterExpiry])

  const totalPositions = allPositions.length
  const portfolioPositionCount = useMemo(() => flattenPositions(accounts).length, [accounts])
  const hasAccountSelection =
    (!hostAccountId && !secondaryAccountId) || accountFilter.host || accountFilter.secondary

  // Vendor Greeks for the legs actually held (Owner decision 2026-09-05: the
  // Golden Source is the authority, not a second in-house derivation). Read from
  // the scoped set so the cockpit's θ/day does not move with a grid filter.
  const greekLegs: GreekLeg[] = scopedInstanceGroups.flatMap((g) =>
    g.options.map((p) => ({
      underlying: extractUnderlyingRootSymbol(p.symbol),
      expiry: p.expiry,
      strike: p.strike,
      right: p.right,
      qty: p.qty,
    })),
  )
  const greeks = useOptionGreeks(greekLegs)

  // One derivation feeding the cockpit, the dashboard, the ladder and the obligations.
  const alarm = usePositionsAlarm({
    groups: scopedInstanceGroups,
    quotesBySymbol,
    accounts,
    liveStocks: allStocks,
    coreStocks,
    incomeEtfs: fixedIncomeStocks,
    cashLike: cashLikeStocks,
    thetaPerDay: greeks.matched > 0 ? greeks.theta : null,
    cushionTightPct,
  })

  const riskLegs: RiskMapLeg[] = useMemo(
    () =>
      buildRiskMapLegs({
        legs: alarm.legs,
        spotOf: (leg) => quotesBySymbol[leg.underlying]?.last ?? null,
      }),
    [alarm.legs, quotesBySymbol],
  )

  const obligationsRows = useMemo(() => {
    const cover = coverByAccountSymbol(coreStocks, alarm.exposure.byAccountSymbol)
    return sortObligations(
      buildObligationsRows(alarm.exposure.byAccountSymbol, cover.rows, coreStocks),
      obligationsSort,
    )
  }, [coreStocks, alarm.exposure.byAccountSymbol, obligationsSort])

  const activeExpiry = filterExpiry.replace(/\D/g, '').length === 8 ? filterExpiry : null
  const toggleSymbolScope = useCallback(
    (symbol: string) => setFilterSymbol((prev) => (prev.trim().toUpperCase() === symbol ? '' : symbol)),
    [],
  )
  const toggleExpiryScope = useCallback(
    (expiry: string) => setFilterExpiry((prev) => (prev === expiry ? '' : expiry)),
    [],
  )
  const openFromBackingSegment = useCallback(
    (target: BackingSegmentTarget) => {
      if (target === 'income') openTarget('independent')
      else openTarget('coverage', target === 'puts' ? 'cash' : target === 'free' ? 'spare' : 'calls')
    },
    [openTarget],
  )

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
      <PageShell className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-3">
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
    <PageShell className="space-y-3">
      <PageHeader
        title="Positions"
        description="The option book against its base: what the options need, what backs them, and where it is tight."
        actions={
          <div className="flex items-center gap-1.5">
            {portfolioPositionCount > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {hasAccountSelection ? totalPositions : 0} position
                {hasAccountSelection && totalPositions !== 1 ? 's' : ''}
                {!hasAccountSelection ? ' (select account)' : ''}
              </Badge>
            ) : null}
            {/* Program research-copilot-reach P1 — the Copilot already has
                trade.portfolio_snapshot / portfolio_risk_summary; this hands it
                the page's live context so the user need not retype it. */}
            <AskCopilotButton
              originPage="positions"
              originLabel="Positions"
              symbol={filterSymbol || undefined}
              snapshot={compactSnapshot({
                lines_view: linesView,
                total_positions: hasAccountSelection ? totalPositions : 0,
                portfolio_position_count: portfolioPositionCount,
                accounts: accountFilter,
                filter_symbol: filterSymbol || undefined,
                filter_expiry: filterExpiry || undefined,
              })}
              suggestedPrompt="分析我当前持仓的风险暴露：集中度、净 delta/vega、各标的 IV，以及任何需要减仓或对冲的头寸。"
            />
          </div>
        }
      />

      {!showOpenPositionsPanel ? (
        <EmptyState
          title="No open positions"
          description="Position data comes from account snapshots. Ensure IB is connected and Account Sync is running."
        />
      ) : (
        <>
          <PositionsOpenControls
            filterSymbol={filterSymbol}
            onFilterSymbolChange={setFilterSymbol}
            filterExpiry={filterExpiry}
            onFilterExpiryChange={setFilterExpiry}
            hostAccountId={hostAccountId}
            secondaryAccountId={secondaryAccountId}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            cushionTightPct={cushionTightPct}
            onCushionTightPctChange={setCushionTightPct}
            scopedCount={hasAccountSelection ? totalPositions : 0}
          />

          {!hasAccountSelection ? (
            <EmptyState
              title="Select an account"
              description="Turn on HOST and/or Secondary above to show open positions for those accounts."
            />
          ) : totalPositions === 0 ? (
            <EmptyState
              title="No positions match filters"
              description="No open positions under the current symbol, expiry, or account filters. Off-track options appear when both HOST and Secondary are enabled."
            />
          ) : (
            <div className="min-w-0 space-y-3">
              {/* Band 1: the state of the book on the left (gauges, margin by
                  account, the short legs against the tightness line), the Owner's
                  pictures of the base on the right. */}
              <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <BookVsBaseCockpit
                    book={alarm.book}
                    checks={alarm.checks}
                    cushionTightPct={cushionTightPct}
                    onOpenTarget={openTarget}
                  />
                  <MarginByAccountStrip
                    margin={alarm.margin}
                    hostId={hostAccountId}
                    secondaryId={secondaryAccountId}
                    accountFilter={accountFilter}
                  />
                  <ShortLegsPanel
                    legs={riskLegs}
                    tightPct={cushionTightPct}
                    activeExpiry={activeExpiry}
                    onLegClick={(leg) => {
                      setFilterSymbol(leg.symbol)
                      openTarget('lines')
                    }}
                    onExpiryClick={toggleExpiryScope}
                    onUnpricedClick={() => openTarget('ladder')}
                  />
                </div>
                <PositionsDashboard
                  open={openSections.charts}
                  onToggle={() => toggleSection('charts')}
                  book={alarm.book}
                  stocks={allStocks}
                  coreStocks={coreStocks}
                  incomeEtfs={fixedIncomeStocks}
                  cashLike={cashLikeStocks}
                  accounts={scopedAccounts}
                  quotesBySymbol={quotesBySymbol}
                  quotesByCk={quotesByCk}
                  activeSymbol={filterSymbol.trim().toUpperCase()}
                  onSymbolClick={toggleSymbolScope}
                  onBackingSegment={openFromBackingSegment}
                />
              </div>

              {/* Band 2: the lines, most dangerous first. */}
              <div id="positions-lines" className="min-w-0">
                <LinesToolbar
                  view={linesView}
                  onViewChange={setLinesView}
                  detailViewMode={detailViewMode}
                  onDetailViewModeChange={setDetailViewMode}
                  structureTypes={instanceFilterOptions.structureTypes}
                  oppNames={instanceFilterOptions.oppNames}
                  scopeTypes={instanceFilterOptions.scopeTypes}
                  values={instanceFilters}
                  onChange={setInstanceFilters}
                  shown={filteredInstanceGroups.length}
                  total={instanceAllGroups.length}
                />
                {linesView === 'strategy' ? (
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
                    structures={structures}
                    attributions={attributions}
                    instanceStructureById={instanceStructureById}
                    portfolioAccounts={accounts}
                    greeksByTicker={greeks.byTicker}
                    detailViewMode={detailViewMode}
                    onEditExec={requestEditExec}
                    onLinkExec={openLinkExec}
                    onDeleteExec={setDeleteTarget}
                    onRefreshExecs={refreshExecData}
                    onOpenStrategy={openStrategyInspector}
                    canonicalOptContractKeys={canonicalOptContractKeys}
                    onOpenStock={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
                    onOpenOption={(pos) =>
                      setInspector({
                        type: 'option',
                        contractKey: pos.contract_key,
                        optionPosition: pos,
                      })
                    }
                  />
                ) : (
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
                    onRefreshExecs={refreshExecData}
                    canonicalOptContractKeys={canonicalOptContractKeys}
                    onInspect={(pos) =>
                      setInspector({
                        type: 'option',
                        contractKey: pos.contract_key,
                        optionPosition: pos,
                      })
                    }
                    onOpenStrategy={openStrategyInspector}
                  />
                )}
              </div>

              {/* Drill-downs, collapsed and remembered. */}
              <div id="positions-section-ladder">
                <ExpiryLadderSection
                  rows={alarm.ladderRows}
                  quotesBySymbol={quotesBySymbol}
                  cushionTightPct={cushionTightPct}
                  open={openSections.ladder}
                  onToggle={() => toggleSection('ladder')}
                />
              </div>
              <div id="positions-section-coverage">
                <ObligationsRoomSection
                  open={openSections.coverage}
                  onToggle={() => toggleSection('coverage')}
                  rows={obligationsRows}
                  exposure={alarm.exposure}
                  coverRatio={alarm.coverRatio}
                  moreCalls={alarm.book.potential.moreCalls}
                  cashLikeTotal={alarm.book.backing.cashLike}
                  buyingPower={alarm.book.supply.buyingPower}
                  sort={obligationsSort}
                  onSortChange={setObligationsSort}
                  onSymbolClick={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
                  onNakedClick={(symbol) => setFilterSymbol(symbol)}
                />
              </div>
              <div id="positions-section-independent">
                <BaseHoldingsSection
                  open={openSections.independent}
                  onToggle={() => toggleSection('independent')}
                  layers={alarm.book.base}
                  coreStocks={coreStocks}
                  incomeEtfs={fixedIncomeStocks}
                  cashLike={cashLikeStocks}
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
              </div>
              <div id="positions-section-capital">
                <UnderlyingRiskSection
                  accountIds={modelAnalysisAccountIds}
                  greeks={greeks}
                  open={openSections.capital}
                  onToggle={() => toggleSection('capital')}
                />
              </div>
            </div>
          )}
        </>
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
