import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOpportunities } from '@/hooks/useStrategies'
import { useLedgerExecutions, useLedgerExecutionsBook } from '@/hooks/useLedgerExecutions'
import { useLedgerUiSync } from '@/hooks/useLedgerUiSync'
import { useTradeLedgerModel } from '@/hooks/useTradeLedgerModel'
import { PageHeader, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Plus } from 'lucide-react'
import type { LinkExecutionContext } from '@/components/positions/LinkExecutionModal'
import type { Execution } from '@/types/positions'
import { collectPeerInstancePicks } from '@/utils/ledger/ledgerOptHelpers'
import type { LedgerSincePreset, LedgerSummaryPeriod } from '@/utils/ledger/summaryPeriod'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { LedgerTabToolbar } from '@/pages/portfolio/ledger/LedgerTabToolbar'
import { TradeLedgerModals } from '@/pages/portfolio/ledger/TradeLedgerModals'
import { LedgerFilterBar } from '@/pages/portfolio/ledger/LedgerFilterBar'
import { LedgerSummarySection } from '@/pages/portfolio/ledger/LedgerSummarySection'
import { ledgerPageCardClass } from '@/pages/portfolio/ledger/ledgerShellUi'
import type { MainTab, OptSortCol, StkSortCol, GroupBy, OptSubTab, InstanceSubTab, OptInstanceFilter } from '@/pages/portfolio/ledger/ledgerTypes'
import { OptionsTabContent } from '@/pages/portfolio/ledger/OptionsTabContent'
import { StkTabContent } from '@/pages/portfolio/ledger/StkTabContent'
import { StrategyTabContent } from '@/pages/portfolio/ledger/StrategyTabContent'
import { InstanceTabContent } from '@/pages/portfolio/ledger/InstanceTabContent'
import { useTradeLedgerHandlers } from '@/pages/portfolio/ledger/useTradeLedgerHandlers'

const LEDGER_HELP =
  'Trade ledger is the workspace for open and closed trades, Flex/TWS imports, and manual journal entries (journal_closed) for reconciliation. Instance groups option trades by strategy opportunity and instance.'

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TradeLedgerPage() {
  const { data: status } = useMonitorStatus()
  const { data: oppData } = useOpportunities()
  const queryClient = useQueryClient()

  const { data: canonData, isLoading: canonLoading, isError: canonError, refetch: refetchCanon } = useLedgerExecutions({ limit: 0, enabled: true })
  const { data: bookData, isLoading: bookLoading, isError: bookError, refetch: refetchBook } = useLedgerExecutionsBook({ limit: 0, enabled: true })
  const isLoading = canonLoading || bookLoading

  // ── Core filters ────────────────────────────────────────────────────────
  const [sincePreset, setSincePreset] = useState<LedgerSincePreset>('month')
  const [accountFilter, setAccountFilter] = useState('all')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [activeTab, setActiveTab] = useState<MainTab>('strategy')
  const [summaryPeriod, setSummaryPeriod] = useState<LedgerSummaryPeriod>('month')

  // Expiry filter (OPT only, mutually exclusive with sincePreset)
  const [expiryFilterYear, setExpiryFilterYear] = useState('')
  const [expiryFilterMonth, setExpiryFilterMonth] = useState('')

  // Structure / Wishlist symbol filter
  const [filterStructure, setFilterStructure] = useState('')
  const [filterWishlistSymbol, setFilterWishlistSymbol] = useState('')

  // ── Display mode state ──────────────────────────────────────────────────
  const [accordionMode, setAccordionMode] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('opportunity')
  const [optSubTab, setOptSubTab] = useState<OptSubTab>('contracts')
  const [instanceSubTab, setInstanceSubTab] = useState<InstanceSubTab>('with_instance')
  const [optInstanceFilter, setOptInstanceFilter] = useState<OptInstanceFilter>('all')
  const [stkCategoryTab, setStkCategoryTab] = useState('All')

  // Options display
  const [optRightFilter, setOptRightFilter] = useState<'' | 'C' | 'P'>('')
  const [optSort, setOptSort] = useState<{ col: OptSortCol; dir: 'asc' | 'desc' }>({ col: 'expiry', dir: 'desc' })

  // STK display
  const [stkSort, setStkSort] = useState<{ col: StkSortCol; dir: 'asc' | 'desc' }>({ col: 'trade_date', dir: 'desc' })
  const [groupByPosition, setGroupByPosition] = useState(true)

  // Instance tab filter
  const [instanceContainOpenFilter, setInstanceContainOpenFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Expansion state — shared across opt groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  // Strategy outer buckets (when groupBy !== 'opportunity')
  const [outerStrategyExpanded, setOuterStrategyExpanded] = useState<Set<string>>(new Set())
  // Strategy Opportunity expand
  const [strategyOppExpanded, setStrategyOppExpanded] = useState<Set<string>>(new Set())
  const [strategyInstExpanded, setStrategyInstExpanded] = useState<Set<string>>(new Set())
  // Instance outer buckets
  const [outerInstanceExpanded, setOuterInstanceExpanded] = useState<Set<string>>(new Set())

  // Pagination + modals
  const [stkPage, setStkPage] = useState(0)
  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [linkContext, setLinkContext] = useState<LinkExecutionContext | null>(null)

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
  }, [])
  const [expiredCloseTarget, setExpiredCloseTarget] = useState<Execution | null>(null)
  const [viewLinksTarget, setViewLinksTarget] = useState<{ title: string; oid: number } | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [createSource, setCreateSource] = useState<'manual' | 'journal_closed'>('manual')

  const {
    accountTabs,
    accounts,
    dateRange,
    catMap,
    canonFiltered,
    bookFiltered,
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
    stkCategoryOptions,
    effectiveStkCategoryTab,
    stkExecsForDisplay,
    stkPositionGroups,
    stkUnrealizedByKey,
    stkTotals,
    summaryClosedGroups,
    optionsSummaryByMonth,
    stocksSummaryByMonth,
    closedOptGroupsPnlSum,
  } = useTradeLedgerModel({
    status,
    canonData,
    bookData,
    oppData,
    sincePreset,
    accountFilter,
    symbolFilter,
    activeTab,
    summaryPeriod,
    expiryFilterYear,
    expiryFilterMonth,
    filterStructure,
    filterWishlistSymbol,
    groupBy,
    optSubTab,
    instanceSubTab,
    optInstanceFilter,
    stkCategoryTab,
    optRightFilter,
    optSort,
    stkSort,
    groupByPosition,
    instanceContainOpenFilter,
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
    isLoading,
    setActiveTab,
  })

  const {
    toggleGroup,
    toggleStrategyOpp,
    toggleStrategyInst,
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
    accountFilter,
    accounts,
    queryClient,
    setExpandedGroups,
    setStrategyOppExpanded,
    setStrategyInstExpanded,
    setOuterStrategyExpanded,
    setOuterInstanceExpanded,
    setOptSort,
    setStkSort,
    setCreateSource,
    setEditExec,
    deleteTarget,
    setSyncingId,
  })

  const isStkTab = activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like'
  const sinceDisabled = sincePreset !== 'all'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell padding="compact" className="space-y-3">
      <div className={ledgerPageCardClass}>
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Trade ledger</p>}
          title={
            <span className="inline-flex items-center gap-1.5">
              Trade ledger
              <InfoTooltip text={LEDGER_HELP} />
            </span>
          }
          actions={
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleHeaderAddJournal}>
                <Plus className="h-3.5 w-3.5" />
                Add journal
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={() => { void refetchCanon(); void refetchBook() }}
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
            onRetry={() => { void refetchCanon(); void refetchBook() }}
          />
        )}

        <LedgerFilterBar
          sincePreset={sincePreset}
          onSincePreset={setSincePreset}
          dateRange={dateRange}
          accountTabs={accountTabs}
          accountFilter={accountFilter}
          onAccountFilter={setAccountFilter}
          symbolFilter={symbolFilter}
          onSymbolFilter={setSymbolFilter}
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
        />

        <LedgerTabToolbar
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setStkPage(0) }}
          hasOptExecs={hasOptExecs}
          hasStkExecs={hasStkExecs}
          hasFixedIncomeExecs={hasFixedIncomeExecs}
          hasCashLikeExecs={hasCashLikeExecs}
          accordionMode={accordionMode}
          onAccordionModeChange={setAccordionMode}
          filters={{
            activeTab,
            hasOptExecs,
            isStkTab,
            groupBy,
            setGroupBy,
            optRightFilter,
            setOptRightFilter,
            strategyPanelOptionRights,
            strategyOpportunityGroupsLength: strategyOpportunityGroups.length,
            filteredStrategyOpportunityGroupsLength: filteredStrategyOpportunityGroups.length,
            instanceSubTab,
            setInstanceSubTab,
            instanceGroupsWithCount: instanceGroupsRaw.withInst.length,
            noInstanceOptGroupsLength: noInstanceOptGroups.length,
            instanceContainOpenFilter,
            setInstanceContainOpenFilter,
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
            stkCategoryOptions,
            effectiveStkCategoryTab,
            setStkCategoryTab,
            setStkPage,
          }}
        />

        {!isLoading && (canonFiltered.length > 0 || bookFiltered.length > 0) && (
          <LedgerSummarySection
            activeTab={activeTab}
            summaryPeriod={summaryPeriod}
            onSummaryPeriodChange={setSummaryPeriod}
            optionsSummaryByMonth={optionsSummaryByMonth}
            stocksSummaryByMonth={stocksSummaryByMonth}
            summaryClosedGroups={summaryClosedGroups}
            closedOptGroupsPnlSum={closedOptGroupsPnlSum}
            stkFilteredExecutions={stkExecsForDisplay}
            stkUnrealizedByKey={stkUnrealizedByKey}
            stkTotals={stkTotals}
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
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
            onDelete={setDeleteTarget}
            onLinkStrategy={handleLinkStrategy}
            onViewLinks={setViewLinksTarget}
            onExpiredClose={setExpiredCloseTarget}
            syncingId={syncingId}
            onSyncOpposite={handleSyncOppositeLeg}
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
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
            onDelete={setDeleteTarget}
            onAddJournal={handleAddJournal}
          />
        )}

        {!isLoading && activeTab === 'strategy' && (
          filteredStrategyOpportunityGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No opportunities match the current type filter.</p>
          ) : (
          <StrategyTabContent
            displayBuckets={strategyDisplayBuckets}
            groupBy={groupBy}
            linkByOptionId={linkByOptionId}
            outerExpanded={outerStrategyExpanded}
            toggleOuter={toggleOuterStrategy}
            strategyOppExpanded={strategyOppExpanded}
            toggleStrategyOpp={toggleStrategyOpp}
            strategyInstExpanded={strategyInstExpanded}
            toggleStrategyInst={toggleStrategyInst}
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
            onEdit={e => { setCreateSource('manual'); setEditExec(e) }}
            onDelete={setDeleteTarget}
            onLinkStrategy={handleLinkStrategy}
            onViewLinks={setViewLinksTarget}
            syncingId={syncingId}
            onSyncOpposite={handleSyncOppositeLeg}
          />
        )}
      </div>

      <TradeLedgerModals
        accounts={accounts}
        opportunities={oppData?.items ?? []}
        linkByOptionId={linkByOptionId}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onDelete={handleDelete}
        editExec={editExec}
        setEditExec={e => { if (e === null) handleCloseEditModal(); else setEditExec(e) }}
        linkContext={linkContext}
        setLinkContext={setLinkContext}
        expiredCloseTarget={expiredCloseTarget}
        setExpiredCloseTarget={setExpiredCloseTarget}
        viewLinksTarget={viewLinksTarget}
        setViewLinksTarget={setViewLinksTarget}
        createSource={createSource}
      />
    </PageShell>
  )
}

