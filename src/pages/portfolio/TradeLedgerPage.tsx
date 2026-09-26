import { useCallback, useMemo, useState } from 'react'
import { usePageViewParams, usePageViewSet, usePageViewState } from '@/lib/pageView'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { usePositionsScope } from '@/hooks/usePositionsScope'
import { useLedgerUiSync } from '@/pages/portfolio/ledger/useLedgerUiSync'
import { useTradeLedgerModel } from '@/pages/portfolio/ledger/useTradeLedgerModel'
import { PageHeader, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Plus } from 'lucide-react'
import type { LinkExecutionContext } from '@/components/positions/LinkExecutionModal'
import type { Execution } from '@/types/positions'
import { collectPeerInstancePicks } from '@/utils/ledger/ledgerOptHelpers'
import type { LedgerSincePreset, LedgerSummaryPeriod } from '@/utils/ledger/summaryPeriod'
import { LEDGER_SINCE_PRESET_TABS, LEDGER_SUMMARY_PERIOD_TABS } from '@/utils/ledger/summaryPeriod'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { LedgerTabToolbar } from '@/pages/portfolio/ledger/LedgerTabToolbar'
import { TradeLedgerModals } from '@/pages/portfolio/ledger/TradeLedgerModals'
import { LedgerFilterBar } from '@/pages/portfolio/ledger/LedgerFilterBar'
import { LedgerSummarySection } from '@/pages/portfolio/ledger/LedgerSummarySection'
import { LedgerHealthBand } from '@/pages/portfolio/ledger/LedgerHealthBand'
import { LedgerInspector } from '@/pages/portfolio/ledger/LedgerInspector'
import { ledgerPageCardClass } from '@/pages/portfolio/ledger/ledgerShellUi'
import type { MainTab, OptSortCol, StkSortCol, GroupBy, OptSubTab, InstanceSubTab, OptInstanceFilter, StrategyScope } from '@/pages/portfolio/ledger/ledgerTypes'
import { isSharesTab } from '@/pages/portfolio/ledger/ledgerTypes'
import { buildAttributionChips, buildInstrumentChips } from '@/pages/portfolio/ledger/ledgerViewChips'
import { unlinkedOpportunityCount } from '@/pages/portfolio/ledger/ledgerStrategyScope'
import { OptionsTabContent } from '@/pages/portfolio/ledger/OptionsTabContent'
import { StkTabContent } from '@/pages/portfolio/ledger/StkTabContent'
import { StrategyTabContent } from '@/pages/portfolio/ledger/StrategyTabContent'
import { InstanceTabContent } from '@/pages/portfolio/ledger/InstanceTabContent'
import { useTradeLedgerHandlers } from '@/pages/portfolio/ledger/useTradeLedgerHandlers'
import { QUERY_KEYS } from '@/constants/queryKeys'
import {
  ledgerAccountIdFromScope,
  ledgerScopeFromAccountId,
} from '@/lib/ledgerAccountTabs'
import { ledgerStructureFilterAppliesToTab, parseLedgerTradeDay } from '@/pages/portfolio/ledger/ledgerFilterMatch'
import { buildLedgerHealth, type LedgerHealthTile } from '@/pages/portfolio/ledger/ledgerHealth'
import {
  buildLedgerReconcile,
  isUndatedExecution,
  undatedSummaryNote,
  type LedgerUnlinkBasis,
} from '@/pages/portfolio/ledger/ledgerReconcile'
import type { LedgerRowType } from '@/pages/portfolio/ledger/ledgerRowType'
import {
  type LedgerInspectorFace,
  type LedgerInspectorState,
} from '@/pages/portfolio/ledger/ledgerInspectorState'
import { buildLedgerMetricExplainPayload } from '@/pages/portfolio/ledger/ledgerSummaryExplainPayload'
import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'
import { expiredCloseTarget } from '@/pages/portfolio/ledger/ledgerJournalWrite'
import { fillFromViewLinks } from '@/pages/portfolio/ledger/ledgerViewLinks'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import type { OptionStockLinkSummary } from '@/types/trading'

function pickGroupFill(
  group: OptExecutionGroup,
  linkByOptionId: Record<number, OptionStockLinkSummary>,
): Execution | undefined {
  const trades = group.trades ?? []
  return (
    trades.find(t => {
      const id = t.account_executions_id
      return id != null && (linkByOptionId[id]?.links?.length ?? 0) > 0
    }) ?? trades.find(t => t.account_executions_id != null)
  )
}

const PAGE_LEAD =
  'What was traded, and whether the three sources agree. TWS is fast but not authoritative, Flex is authoritative but late, the journal closes what neither covers.'

// ─── Main page ───────────────────────────────────────────────────────────────

const LEDGER_VIEW_PARAMS = ['acct', 'date'] as const

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading, isError: canonError, refetch: refetchCanon } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading, isError: bookError, refetch: refetchBook } = useLedgerExecutionsBook({ limit: 0, enabled: true })
  const isLoading = canonLoading || bookLoading

  // ── Core filters ────────────────────────────────────────────────────────
  // The page's view (design Rev .79): the filters, the tab and its sub-view,
  // the sort, the folds and the open groups are kept for this tab's session,
  // and the account and day in the URL come back with them. The inspector is
  // not — it holds a picked fill, which is data — nor the journal draft.
  usePageViewParams(LEDGER_VIEW_PARAMS)
  const { scope, setAccountFilter: setScopeAccount, setFilterSymbol } = usePositionsScope()
  const [sincePreset, setSincePresetState] = usePageViewState<LedgerSincePreset>('since', 'month')
  // `?date=YYYY-MM-DD` (Performance → a day's records → Ledger · this day) narrows to one
  // trade date. Picking a Since window, or clearing the chip, drops it.
  const [searchParams, setSearchParams] = useSearchParams()
  const tradeDay = parseLedgerTradeDay(searchParams.get('date'))
  const clearTradeDay = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('date')
      return next
    }, { replace: true })
  }, [setSearchParams])
  const setSincePreset = useCallback((preset: LedgerSincePreset) => {
    setSincePresetState(preset)
    clearTradeDay()
  }, [clearTradeDay, setSincePresetState])
  const [activeTab, setActiveTab] = usePageViewState<MainTab>('view', 'strategy')
  const [summaryPeriod, setSummaryPeriod] = usePageViewState<LedgerSummaryPeriod>('period', 'month')
  const [rowType, setRowType] = usePageViewState<LedgerRowType>('rowType', 'all')
  const [unlinkBasis, setUnlinkBasis] = usePageViewState<LedgerUnlinkBasis>('unlinkBasis', 'options')
  const [inspector, setInspector] = useState<LedgerInspectorState>({ type: null })
  const accountFilter = ledgerAccountIdFromScope(scope.accountFilter, status)
  const symbolFilter = scope.filterSymbol

  // Expiry filter (OPT only, mutually exclusive with sincePreset)
  const [expiryFilterYear, setExpiryFilterYear] = usePageViewState('expYear', '')
  const [expiryFilterMonth, setExpiryFilterMonth] = usePageViewState('expMonth', '')

  // Structure / Wishlist symbol filter
  const [filterStructure, setFilterStructure] = usePageViewState('structure', '')
  const [filterWishlistSymbol, setFilterWishlistSymbol] = usePageViewState('watch', '')

  // ── Display mode state ──────────────────────────────────────────────────
  const [accordionMode, setAccordionMode] = usePageViewState('accordion', false)
  const [groupBy, setGroupBy] = usePageViewState<GroupBy>('groupBy', 'opportunity')
  const [optSubTab, setOptSubTab] = usePageViewState<OptSubTab>('sub.options', 'contracts')
  const [instanceSubTab, setInstanceSubTab] = usePageViewState<InstanceSubTab>('sub.instance', 'with_instance')
  const [strategyScope, setStrategyScope] = usePageViewState<StrategyScope>('sub.strategy', 'all')
  const [optInstanceFilter, setOptInstanceFilter] = useState<OptInstanceFilter>('all')
  const [stkCategoryTab, setStkCategoryTab] = usePageViewState('layoutSub.category', 'All')

  // Options display
  const [optRightFilter, setOptRightFilter] = useState<'' | 'C' | 'P'>('')
  const [optSort, setOptSort] = usePageViewState<{ col: OptSortCol; dir: 'asc' | 'desc' }>('sort.options', { col: 'expiry', dir: 'desc' })

  // STK display
  const [stkSort, setStkSort] = usePageViewState<{ col: StkSortCol; dir: 'asc' | 'desc' }>('sort.shares', { col: 'trade_date', dir: 'desc' })
  const [groupByPosition, setGroupByPosition] = usePageViewState('layoutSub.byPosition', true)

  // Expansion state — shared across opt groups
  const [expandedGroups, setExpandedGroups] = usePageViewSet<string>('optRow')
  // Strategy outer buckets (when groupBy !== 'opportunity')
  const [outerStrategyExpanded, setOuterStrategyExpanded] = useState<Set<string>>(new Set())
  // Strategy Opportunity expand
  const [strategyOppExpanded, setStrategyOppExpanded] = usePageViewSet<string>('openOpp')
  // Instance outer buckets
  const [outerInstanceExpanded, setOuterInstanceExpanded] = usePageViewSet<string>('openInst.outer')

  // Pagination + modals
  const [stkPageState, setStkPageState] = useState({ scope: '', page: 0 })
  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [createSource, setCreateSource] = useState<'manual' | 'journal_closed'>('manual')
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [linkContext, setLinkContext] = useState<LinkExecutionContext | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [syncError, setSyncError] = useState<{ id: number; message: string } | null>(null)

  const handleLinkStrategy = useCallback((ex: Execution, sameContractTrades?: Execution[]) => {
    const execId = ex.account_executions_id
    if (execId == null) return
    const peerPicks =
      sameContractTrades && sameContractTrades.length > 0
        ? collectPeerInstancePicks(sameContractTrades, execId)
        : []
    setLinkContext({
      account_executions_id: execId,
      execution: ex,
      ...(peerPicks.length > 0 ? { peer_instance_picks: peerPicks } : {}),
    })
  }, [setLinkContext])

  const {
    accountTabs,
    accounts,
    dateRange,
    catMap,
    canonFiltered,
    bookFiltered,
    canonContractScope,
    bookContractScope,
    unreportedTypeCount,
    linkByOptionId,
    structureOptions,
    wishlistSymbolOptions,
    expiryYearOptions,
    expiryMonthOptions,
    activeFilterSummary,
    symbolSuggestions,
    filteredClosedOptGroups,
    sortedOpenOptGroups,
    allOrphanGroups,
    strategyOpportunityGroups,
    filteredStrategyOpportunityGroups,
    strategyPanelOptionRights,
    instanceGroupsRaw,
    filteredInstanceGroups,
    noInstanceOptGroups,
    strategyDisplayBuckets,
    instanceDisplayBuckets,
    hasOptExecs,
    hasStkExecs,
    hasFixedIncomeExecs,
    hasCashLikeExecs,
    hasComboExecs,
    containsOpenCount,
    uncategorizedCount,
    stkByBucket,
    comboExecs,
    stkCategoryOptions,
    effectiveStkCategoryTab,
    stkExecsForDisplay,
    stkPositionGroups,
    stkUnrealizedByKey,
    stkTotals,
    closedOptGroups,
    optionsSummaryByMonth,
    stocksSummaryByMonth,
    closedOptGroupsPnlSum,
  } = useTradeLedgerModel({
    status,
    canonData,
    bookData,
    oppData,
    sincePreset,
    tradeDay,
    accountFilter,
    symbolFilter,
    activeTab,
    summaryPeriod,
    expiryFilterYear,
    expiryFilterMonth,
    filterStructure,
    filterWishlistSymbol,
    rowType,
    groupBy,
    optSubTab,
    instanceSubTab,
    optInstanceFilter,
    stkCategoryTab,
    optRightFilter,
    optSort,
    stkSort,
    groupByPosition,
    instanceContainOpenFilter: instanceSubTab === 'contains_open' ? 'yes' : 'all',
  })

  useLedgerUiSync({
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
  })

  const {
    toggleGroup,
    toggleStrategyOpp,
    toggleOuterStrategy,
    toggleOuterInstance,
    toggleOptSort,
    toggleStkSort,
    handleAddJournal,
    handleHeaderAddJournal,
    handleCloseEditModal,
    handleDelete,
    handleSyncOppositeLeg,
  } = useTradeLedgerHandlers({
    accordionMode,
    queryClient,
    setExpandedGroups,
    setStrategyOppExpanded,
    setOuterStrategyExpanded,
    setOuterInstanceExpanded,
    setOptSort,
    setStkSort,
    setInspector,
    setEditExec,
    setCreateSource,
    accountFilter,
    accounts,
    deleteTarget,
    setSyncingId,
    setSyncError,
  })

  const stockFills = useMemo(
    () => (canonData?.items ?? []).filter(e => (e.sec_type ?? '').toUpperCase() === 'STK'),
    [canonData],
  )

  const openLinks = useCallback((execution?: Execution | null) => {
    setInspector({ type: 'links', execution: execution ?? undefined })
  }, [setInspector])
  const openLinksFromView = useCallback(
    (ctx: import('@/pages/portfolio/ledger/LedgerOptContractCell').ViewLinksPayload) => {
      openLinks(fillFromViewLinks(ctx, canonData?.items ?? []) ?? null)
    },
    [openLinks, canonData],
  )

  const isStkTab = isSharesTab(activeTab)
  const stkPageScope = `${accountFilter}|${symbolFilter}|${activeTab}|${stkCategoryTab}|${groupByPosition}`
  const stkPage = stkPageState.scope === stkPageScope ? stkPageState.page : 0
  const setStkPage = (page: number) => setStkPageState({ scope: stkPageScope, page })

  const attributionChips = useMemo(
    () =>
      buildAttributionChips({
        opportunityCount: strategyOpportunityGroups.length,
        instanceWith: instanceGroupsRaw.withInst.length,
        instanceWithout: noInstanceOptGroups.length,
      }),
    [strategyOpportunityGroups.length, instanceGroupsRaw, noInstanceOptGroups.length],
  )
  const instrumentChips = useMemo(
    () =>
      buildInstrumentChips({
        closedOpt: closedOptGroups.length,
        openOpt: allOrphanGroups.length,
        stocks: stkByBucket.stocks.length,
        fixedIncome: stkByBucket.fixed_income.length,
        cashLike: stkByBucket.cash_like.length,
        combos: comboExecs.length,
      }),
    [
      closedOptGroups.length,
      allOrphanGroups.length,
      stkByBucket,
      comboExecs.length,
    ],
  )

  function goToInstance(instanceId: number) {
    setActiveTab('instance')
    setInstanceSubTab('with_instance')
    setExpandedGroups(prev => {
      const next = accordionMode ? new Set<string>() : new Set(prev)
      next.add(`inst-${instanceId}`)
      return next
    })
  }
  const sinceDisabled = sincePreset !== 'all' || tradeDay != null
  const structureApplies = ledgerStructureFilterAppliesToTab(activeTab)
  const sinceLabel = tradeDay
    ? fmtIsoDateToken(tradeDay)
    : LEDGER_SINCE_PRESET_TABS.find(t => t.id === sincePreset)?.label ?? sincePreset

  const health = useMemo(
    () =>
      buildLedgerHealth({
        canon: canonFiltered,
        book: bookFiltered,
        closedPnl: closedOptGroupsPnlSum,
        sinceLabel,
        unlinkBasis,
      }),
    [canonFiltered, bookFiltered, closedOptGroupsPnlSum, sinceLabel, unlinkBasis],
  )
  const reconcile = useMemo(
    () => buildLedgerReconcile(canonContractScope, bookContractScope, canonData?.items ?? []),
    [canonContractScope, bookContractScope, canonData],
  )
  const undatedRows = useMemo(() => canonFiltered.filter(isUndatedExecution), [canonFiltered])
  const undatedNote = undatedSummaryNote(undatedRows)

  const explainPayload = useMemo(() => {
    if (inspector.type !== 'explain' || inspector.target?.source !== 'summary') return null
    return buildLedgerMetricExplainPayload({
      kind: inspector.target.kind,
      id: inspector.target.id,
      ledgerTabLabel:
        activeTab === 'fixed_income'
          ? 'Fixed income'
          : activeTab === 'cash_like'
            ? 'Cash-like'
            : activeTab === 'combos'
              ? 'Combos'
              : activeTab === 'all'
                ? 'All'
                : activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
      summaryPeriodModeLabel: LEDGER_SUMMARY_PERIOD_TABS.find(t => t.id === summaryPeriod)?.label ?? summaryPeriod,
      ledgerSummaryPeriod: summaryPeriod,
      closedOptionGroups: closedOptGroups,
      stockFilteredExecutions: stkExecsForDisplay,
      closedOptGroupsPnlSum,
      stkUnrealizedByAccountContract: stkUnrealizedByKey,
    })
  }, [inspector, activeTab, summaryPeriod, closedOptGroups, stkExecsForDisplay, closedOptGroupsPnlSum, stkUnrealizedByKey])

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.optStockLinks })
    void queryClient.invalidateQueries({ queryKey: ['ledgerLinksFace'] })
    void refetchCanon()
    void refetchBook()
  }, [queryClient, refetchCanon, refetchBook])

  function openExplain(kind: LedgerMetricExplainKind, id: string) {
    setInspector({ type: 'explain', target: { source: 'summary', kind, id } })
  }

  function onHealthTile(tile: LedgerHealthTile) {
    if (tile.id === 'closed_pnl') {
      setInspector({ type: 'explain', target: { source: 'summary', kind: 'options_total_realized', id: 'opt-total' } })
      return
    }
    if (tile.id === 'commissions') {
      setInspector({ type: 'explain', target: { source: 'health', kind: 'commissions' } })
      return
    }
    if (tile.id === 'unlinked') {
      setInspector({ type: 'explain', target: { source: 'health', kind: 'unlinked' } })
      return
    }
    setInspector({ type: 'reconcile', focus: 'diff' })
  }

  function onInspectorFace(face: LedgerInspectorFace) {
    if (face === 'explain') {
      setInspector({ type: 'explain', target: inspector.type === 'explain' ? inspector.target : null })
      return
    }
    if (face === 'reconcile') {
      setInspector({ type: 'reconcile' })
      return
    }
    if (face === 'links') {
      setInspector({
        type: 'links',
        execution: inspector.type === 'links' ? inspector.execution : undefined,
      })
      return
    }
    setInspector({
      type: 'journal',
      seed: inspector.type === 'journal' ? inspector.seed : undefined,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell padding="compact" className="space-y-3">
      <div className={ledgerPageCardClass}>
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Trade ledger</p>}
          title="Trade Ledger"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <>
              <span className="font-mono text-dense-caption text-muted-foreground">history · no polling</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={handleHeaderAddJournal}
              >
                <Plus className="h-3.5 w-3.5" />
                Add journal
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={refreshAll}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </>
          }
        />

        {(canonError || bookError) && (
          <QueryErrorAlert
            error="Failed to load executions — check Trading API connection."
            onRetry={refreshAll}
          />
        )}

        {!isLoading && (
          <LedgerHealthBand
            model={health}
            unlinkBasis={unlinkBasis}
            onUnlinkBasis={setUnlinkBasis}
            onTile={onHealthTile}
            onOpenReconcile={() => setInspector({ type: 'reconcile', focus: 'diff' })}
          />
        )}

        <LedgerFilterBar
          sincePreset={sincePreset}
          onSincePreset={setSincePreset}
          tradeDay={tradeDay}
          onClearTradeDay={clearTradeDay}
          dateRange={dateRange}
          accountTabs={accountTabs}
          accountFilter={accountFilter}
          onAccountFilter={id => setScopeAccount(ledgerScopeFromAccountId(id, status))}
          symbolFilter={symbolFilter}
          onSymbolFilter={setFilterSymbol}
          symbolSuggestions={symbolSuggestions}
          structureOptions={structureOptions}
          filterStructure={filterStructure}
          onFilterStructure={setFilterStructure}
          wishlistSymbolOptions={wishlistSymbolOptions}
          filterWishlistSymbol={filterWishlistSymbol}
          onFilterWishlistSymbol={setFilterWishlistSymbol}
          expiryFilterYear={expiryFilterYear}
          onExpiryFilterYear={setExpiryFilterYear}
          expiryFilterMonth={expiryFilterMonth}
          onExpiryFilterMonth={setExpiryFilterMonth}
          expiryYearOptions={expiryYearOptions}
          expiryMonthOptions={expiryMonthOptions}
          sinceDisabled={sinceDisabled}
          activeFilterSummary={activeFilterSummary}
          groupByPosition={groupByPosition}
          onToggleGroupByPosition={() => setGroupByPosition(v => !v)}
          showStkControls={false}
          rowType={rowType}
          onRowType={setRowType}
          unreportedTypeCount={unreportedTypeCount}
          structureApplies={structureApplies}
        />

        <LedgerTabToolbar
          attributionChips={attributionChips}
          instrumentChips={instrumentChips}
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setStkPage(0) }}
          accordionMode={accordionMode}
          onAccordionModeChange={setAccordionMode}
          filters={{
            activeTab,
            hasOptExecs,
            groupBy,
            setGroupBy,
            optRightFilter,
            setOptRightFilter,
            strategyPanelOptionRights,
            strategyOpportunityGroupsLength: strategyOpportunityGroups.length,
            filteredStrategyOpportunityGroupsLength: filteredStrategyOpportunityGroups.length,
            strategyScope,
            setStrategyScope,
            strategyUnlinkedCount: unlinkedOpportunityCount(filteredStrategyOpportunityGroups),
            instanceSubTab,
            setInstanceSubTab,
            instanceGroupsWithCount: instanceGroupsRaw.withInst.length,
            noInstanceOptGroupsLength: noInstanceOptGroups.length,
            containsOpenCount,
            filteredInstanceGroupsLength: filteredInstanceGroups.length,
            instanceGroupsLength: instanceGroupsRaw.withInst.length,
            optSubTab,
            setOptSubTab,
            filteredClosedOptGroupsLength: filteredClosedOptGroups.length,
            allOrphanGroupsLength: allOrphanGroups.length,
            optInstanceFilter,
            setOptInstanceFilter,
            optSort,
            toggleOptSort,
            groupByPosition,
            setGroupByPosition,
            stkCategoryTab: effectiveStkCategoryTab,
            setStkCategoryTab,
            uncategorizedCount,
            stkFillCount: stkExecsForDisplay.length,
            stkGroupCount: stkPositionGroups?.length ?? 0,
          }}
        />

        {!isLoading && (canonFiltered.length > 0 || bookFiltered.length > 0) && (
          <LedgerSummarySection
            activeTab={activeTab}
            summaryPeriod={summaryPeriod}
            onSummaryPeriodChange={setSummaryPeriod}
            optionsSummaryByMonth={optionsSummaryByMonth}
            stocksSummaryByMonth={stocksSummaryByMonth}
            summaryClosedGroups={closedOptGroups}
            closedOptGroupsPnlSum={closedOptGroupsPnlSum}
            stkFilteredExecutions={stkExecsForDisplay}
            stkUnrealizedByKey={stkUnrealizedByKey}
            stkTotals={stkTotals}
            undatedCount={undatedRows.length}
            undatedNote={undatedNote}
            onExplain={openExplain}
            onShowUndated={() => setInspector({ type: 'reconcile', focus: 'undated' })}
          />
        )}

        {!isLoading && canonFiltered.length === 0 && bookFiltered.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No execution data. Use Overview to fetch from IB (Refresh), or add a manual journal entry (Add journal).
            {activeFilterSummary.length > 0 ? ' Filters applied.' : ''}
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {!isLoading && activeTab === 'options' && (
          <OptionsTabContent
            optSubTab={optSubTab}
            closedGroups={filteredClosedOptGroups}
            openActiveGroups={sortedOpenOptGroups.filter(g => !isOptionExpired(g.expiry))}
            openExpiredGroups={sortedOpenOptGroups.filter(g => isOptionExpired(g.expiry))}
            linkByOptionId={linkByOptionId}
            optSort={optSort}
            toggleOptSort={toggleOptSort}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            onEdit={setEditExec}
            onDelete={setDeleteTarget}
            onLinkStrategy={handleLinkStrategy}
            onLinkStock={openLinks}
            onViewLinks={openLinksFromView}
            onExpiredClose={group => {
              const target = expiredCloseTarget(group)
              if (target.ok) setInspector({ type: 'journal', seed: target.seed })
            }}
            syncingId={syncingId}
            syncError={syncError}
            onSyncOpposite={handleSyncOppositeLeg}
            stockFills={stockFills}
          />
        )}

        {!isLoading && isStkTab && (
          <StkTabContent
            executions={stkExecsForDisplay}
            positionGroups={stkPositionGroups}
            groupByPosition={groupByPosition}
            stkSort={stkSort}
            toggleStkSort={toggleStkSort}
            page={stkPage}
            setPage={setStkPage}
            activeTab={activeTab}
            catMap={catMap}
            stkUnrealizedByKey={stkUnrealizedByKey}
            onEdit={setEditExec}
            onDelete={setDeleteTarget}
            onAddJournal={handleAddJournal}
            onSymbolClick={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
          />
        )}

        {!isLoading && activeTab === 'strategy' && (
          filteredStrategyOpportunityGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No opportunities match the current type filter.</p>
          ) : (
          <StrategyTabContent
            displayBuckets={strategyDisplayBuckets}
            groupBy={groupBy}
            scope={strategyScope}
            linkByOptionId={linkByOptionId}
            outerExpanded={outerStrategyExpanded}
            toggleOuter={toggleOuterStrategy}
            strategyOppExpanded={strategyOppExpanded}
            toggleStrategyOpp={toggleStrategyOpp}
            onGoInstance={goToInstance}
            onContractClick={g => openLinks(pickGroupFill(g, linkByOptionId) ?? null)}
            stockFills={stockFills}
          />
          )
        )}

        {!isLoading && activeTab === 'instance' && (
          <InstanceTabContent
            instanceSubTab={instanceSubTab}
            filteredGroups={filteredInstanceGroups}
            noInstGroups={noInstanceOptGroups}
            noInstExecs={instanceGroupsRaw.noInst}
            linkByOptionId={linkByOptionId}
            groupBy={groupBy}
            displayBuckets={instanceDisplayBuckets}
            outerExpanded={outerInstanceExpanded}
            toggleOuter={toggleOuterInstance}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            accordionMode={accordionMode}
            onEdit={setEditExec}
            onDelete={setDeleteTarget}
            onLinkStrategy={handleLinkStrategy}
            onLinkStock={openLinks}
            onViewLinks={openLinksFromView}
            syncingId={syncingId}
            syncError={syncError}
            onSyncOpposite={handleSyncOppositeLeg}
            stockFills={stockFills}
          />
        )}
      </div>

      <TradeLedgerModals
        accounts={accounts}
        opportunities={oppData?.items ?? []}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onDelete={handleDelete}
        editExec={editExec}
        setEditExec={e => {
          if (e === null) handleCloseEditModal()
          else setEditExec(e)
        }}
        createSource={createSource}
        linkContext={linkContext}
        setLinkContext={setLinkContext}
      />

      <LedgerInspector
        state={inspector}
        onClose={() => setInspector({ type: null })}
        onFace={onInspectorFace}
        explainPayload={explainPayload}
        health={health}
        unlinkBasis={unlinkBasis}
        reconcile={reconcile}
        onWrote={refreshAll}
        onOpenFullJournalForm={handleHeaderAddJournal}
      />
    </PageShell>
  )
}

