/**
 * Positions — what is in the book and where it is tight.
 *
 * One screen, one question. The scope bar decides what the page is about;
 * the cockpit grades the book; the Backing pool ring pictures the base; the
 * grid ranks the lines by danger, in three views (strategies, contracts,
 * expiries). What the options need and what backs them is the next page —
 * Backing — reached from the gauges and the rings, with the same scope.
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { usePersistedChoice } from '@/hooks/usePersistedChoice'
import { usePositionsScope } from '@/hooks/usePositionsScope'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { STORAGE_KEYS } from '@/constants/storage'
import { deleteExecution } from '@/api/trading'
import { PageHeader, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cn } from '@/lib/utils'
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
import { ExpiriesView } from '@/components/positions/ExpiriesView'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { BookFetchMarker } from '@/components/positions/BookFetchMarker'
import { BackingPoolCard } from '@/components/positions/charts/BackingPoolCard'
import { PositionsOpenControls } from '@/components/positions/PositionsOpenControls'
import { BookVsBaseCockpit } from '@/components/positions/BookVsBaseCockpit'
import { MarginByAccountStrip } from '@/components/positions/MarginByAccountStrip'
import { ShortLegsPanel } from '@/components/positions/ShortLegsPanel'
import { RoomToAddSection } from '@/components/positions/RoomToAddSection'
import { EditExecutionConfirmDialog } from '@/components/positions/EditExecutionConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import { LinkExecutionModal, type LinkExecutionContext } from '@/components/positions/LinkExecutionModal'
import { collectPeerInstancePicks } from '@/utils/ledger/ledgerOptHelpers'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { InspectorDrawer, type InspectorState } from '@/components/positions/InspectorDrawer'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { OptionContractDetailFromOpenPosition } from '@/components/optionDiscovery/OptionContractDetailFromOpenPosition'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import { filterInstanceGroups } from '@/utils/filterInstanceGroups'
import { sortInstanceGroupOptions } from '@/utils/instanceGroupSort'
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { computeRoomToAdd, summarizeRoom } from '@/utils/roomToAdd'
import { instanceGroupKey } from '@/utils/instanceSheetExec'
import { riskMapLegShort, type RiskMapLeg } from '@/utils/shortLegRiskMap'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import type { Execution } from '@/types/positions'
import { BACKING_TARGET_ANCHOR, backingHref, isBackingTarget } from '@/utils/backingAnchors'

export default function PositionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Scope: the one set of choices the whole page is about, kept in the URL.
  const { scope, setAccountFilter, setFilterSymbol, setFilterExpiry, scopeSearch } = usePositionsScope()
  const { accountFilter, filterSymbol, filterExpiry } = scope
  const { pct: cushionTightPct, setPct: setCushionTightPct } = useCushionThreshold()
  const book = usePositionsBook(scope, cushionTightPct)

  // Grid-only state: changes what the grid shows, never what the cockpit grades.
  // The view and the expand mode are remembered; the filters are not.
  const [linesView, setLinesView] = usePersistedChoice<LinesView>(STORAGE_KEYS.positionsLinesView, 'strategy', [
    'strategy',
    'contract',
    'expiries',
  ])
  const [detailViewMode, setDetailViewMode] = usePersistedChoice<DetailViewMode>(
    STORAGE_KEYS.positionsDetailMode,
    'accordion',
    ['accordion', 'multi'],
  )
  const [instanceFilters, setInstanceFilters] = useState<InstanceFilterValues>(CLEAR_FILTERS)
  // A leg picked on the risk map. It narrows the grid's views to that leg —
  // grid-only, like the toolbar filters, so the cockpit is untouched — and it
  // lives only as long as the leg is in scope.
  const [pickedLeg, setPickedLeg] = useState<RiskMapLeg | null>(null)
  const selectedLeg = pickedLeg && book.riskLegs.some((l) => l.key === pickedLeg.key) ? pickedLeg : null

  const [editExec, setEditExec] = useState<Execution | null>(null)
  const [editExecConfirm, setEditExecConfirm] = useState<{ open: boolean; exec: Execution | null }>({
    open: false,
    exec: null,
  })
  const [linkContext, setLinkContext] = useState<LinkExecutionContext | null>(null)
  const [closeTarget, setCloseTarget] = useState<{ exec: Execution; netQty: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Execution | null>(null)
  const [inspector, setInspector] = useState<InspectorState>({ type: null })
  const [pressureOpen, setPressureOpen] = useState(true)
  const closeInspector = () => setInspector({ type: null })

  const filteredInstanceGroups = useMemo(() => {
    const groups = sortInstanceGroupOptions(
      filterInstanceGroups({ groups: book.instanceAllGroups, filterSymbol, filters: instanceFilters }),
    )
    return selectedLeg ? groups.filter((g) => instanceGroupKey(g) === selectedLeg.instanceKey) : groups
  }, [book.instanceAllGroups, filterSymbol, instanceFilters, selectedLeg])
  const contractsInView = useMemo(
    () =>
      selectedLeg
        ? book.filteredOptions.filter(
            (p) => p.contract_key === selectedLeg.contractKey && (!selectedLeg.accountId || p.account_id === selectedLeg.accountId),
          )
        : book.filteredOptions,
    [book.filteredOptions, selectedLeg],
  )
  const expiriesInView = useMemo(
    () => (selectedLeg ? book.alarm.ladderRows.filter((r) => r.expiry === selectedLeg.expiry) : book.alarm.ladderRows),
    [book.alarm.ladderRows, selectedLeg],
  )
  const { ceiling, setLevel } = usePressureCeiling()
  const roomFull = useMemo(
    () =>
      computeRoomToAdd({
        book: book.alarm.book,
        margin: book.alarm.margin,
        legs: book.alarm.legs,
        coverRows: book.coverRows,
        resolveSpot: book.alarm.resolveSpot,
        ceiling,
      }),
    [book.alarm.book, book.alarm.margin, book.alarm.legs, book.coverRows, book.alarm.resolveSpot, ceiling],
  )
  const room = useMemo(() => summarizeRoom(roomFull), [roomFull])
  const explain = useMemo(
    () => ({
      exposure: book.alarm.exposure,
      margin: book.alarm.margin,
      accounts: book.scopedAccounts,
      cashLikeRows: book.cashLikeStocks,
      coverRows: book.coverRows,
      room,
    }),
    [book.alarm.exposure, book.alarm.margin, book.scopedAccounts, book.cashLikeStocks, book.coverRows, room],
  )

  const scrollTo = (id: string) =>
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'nearest' }))

  // Every gauge, chip and ring segment lands somewhere: a view of the grid, an
  // anchor on this page, or the Backing page with the same scope.
  const openTarget = useCallback(
    (t: AlarmTarget, sort?: ObligationsSort) => {
      if (t === 'ladder') {
        setLinesView('expiries')
        scrollTo('positions-lines')
      } else if (t === 'lines') {
        scrollTo('positions-lines')
      } else if (t === 'margin') {
        scrollTo('positions-margin')
      } else if (t === 'room') {
        setPressureOpen(true)
        scrollTo('positions-room')
      } else if (isBackingTarget(t)) {
        navigate(backingHref({ scopeSearch, sort, anchor: BACKING_TARGET_ANCHOR[t] }))
      }
    },
    [navigate, scopeSearch, setLinesView],
  )
  const openFromBackingSegment = useCallback(
    (target: 'calls' | 'puts' | 'free' | 'income') => {
      if (target === 'income') openTarget('independent')
      else openTarget('coverage', target === 'puts' ? 'cash' : target === 'free' ? 'spare' : 'calls')
    },
    [openTarget],
  )

  const activeExpiry = filterExpiry.length === 8 ? filterExpiry : null
  const toggleExpiryScope = useCallback(
    (expiry: string) => setFilterExpiry(filterExpiry === expiry ? '' : expiry),
    [filterExpiry, setFilterExpiry],
  )

  const openOptionPosition = inspector.type === 'option' ? inspector.optionPosition : undefined
  const openOptionQuote = openOptionPosition ? book.quotesByCk[openOptionPosition.contract_key] : undefined
  const openOptionUnderlyingHint = useMemo(() => {
    if (!openOptionPosition) return null
    const sym = (openOptionPosition.symbol ?? '').trim().toUpperCase()
    const bench = book.benchBySymbol[sym]
    if (bench?.close != null && Number.isFinite(bench.close)) return bench.close
    const q = book.quotesBySymbol[sym]
    if (q?.last != null && Number.isFinite(q.last)) return q.last
    if (q?.mid != null && Number.isFinite(q.mid)) return q.mid
    return null
  }, [openOptionPosition, book.benchBySymbol, book.quotesBySymbol])
  const inspectorDrawerState: InspectorState = inspector.type === 'option' ? { type: null } : inspector

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
      sameContractTrades?.length && sameContractTrades.length > 0 ? collectPeerInstancePicks(sameContractTrades, execId) : []
    setLinkContext({
      account_executions_id: execId,
      execution: ex,
      ...(peerPicks.length > 0 ? { peer_instance_picks: peerPicks } : {}),
    })
  }

  if (book.isLoading) {
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
  if (book.isError) {
    return (
      <PageShell>
        <Alert variant="destructive">
          <AlertDescription>{(book.error as Error).message}</AlertDescription>
        </Alert>
      </PageShell>
    )
  }

  const scopedCount = book.hasAccountSelection ? book.totalPositions : 0
  const rowsInView =
    linesView === 'strategy' ? filteredInstanceGroups.length : linesView === 'contract' ? contractsInView.length : expiriesInView.length
  const accountsWord =
    accountFilter.host && accountFilter.secondary
      ? 'both accounts'
      : accountFilter.host
        ? 'host'
        : accountFilter.secondary
          ? 'secondary'
          : 'no account'
  const carries = [
    { strategy: 'strategies', contract: 'contracts', expiries: 'expiries' }[linesView],
    `${rowsInView} rows`,
    accountsWord,
    filterSymbol || null,
    filterExpiry || null,
  ]
    .filter(Boolean)
    .join(' · ')
  const openOffTrack = () => {
    setLinesView('strategy')
    setInstanceFilters({ ...CLEAR_FILTERS, attributionType: 'unassigned' })
    scrollTo('positions-lines')
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Positions">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Positions</p>}
          title="Positions"
          titleSize="large"
          description="What is in the book and where it is tight. What backs it is on the Backing page."
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <BookFetchMarker />
              {book.portfolioPositionCount > 0 ? (
                <span className={cn(positionsUi.mono, 'text-xs text-secondary-foreground')}>
                  {scopedCount} position{scopedCount !== 1 ? 's' : ''}
                  {!book.hasAccountSelection ? ' (select account)' : ''}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                {/* Program research-copilot-reach P1 — the Copilot already has
                    trade.portfolio_snapshot / portfolio_risk_summary; this hands it
                    the page's live context so the user need not retype it. */}
                <AskCopilotButton
                  originPage="positions"
                  originLabel="Positions"
                  symbol={filterSymbol || undefined}
                  snapshot={compactSnapshot({
                    lines_view: linesView,
                    total_positions: scopedCount,
                    portfolio_position_count: book.portfolioPositionCount,
                    accounts: accountFilter,
                    filter_symbol: filterSymbol || undefined,
                    filter_expiry: filterExpiry || undefined,
                  })}
                  suggestedPrompt="分析我当前持仓的风险暴露：集中度、净 delta/vega、各标的 IV，以及任何需要减仓或对冲的头寸。"
                />
                <span
                  className={cn(positionsUi.mono, 'text-dense-caption text-muted-foreground')}
                  title="This is the page snapshot the question carries"
                >
                  carries {carries}
                </span>
              </span>
            </span>
          }
        />

        {!book.showOpenPositionsPanel ? (
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
              hostAccountId={book.hostAccountId}
              secondaryAccountId={book.secondaryAccountId}
              accountFilter={accountFilter}
              onAccountFilterChange={setAccountFilter}
              cushionTightPct={cushionTightPct}
              onCushionTightPctChange={setCushionTightPct}
              scopedCount={scopedCount}
              offTrack={
                accountFilter.host && accountFilter.secondary ? { count: book.offTrackCount, onOpen: openOffTrack } : null
              }
            />

            {!book.hasAccountSelection ? (
              <EmptyState
                title="Select an account"
                description="Turn on Host and/or Secondary above to show open positions for those accounts."
              />
            ) : book.totalPositions === 0 ? (
              <EmptyState
                title="No positions match filters"
                description="No open positions under the current symbol, expiry, or account filters. Off-track options appear when both Host and Secondary are enabled."
              />
            ) : (
              <>
                <PositionsTier label="Book" note="how tight · how backed · how exposed · how much room — in that order" />
                {/* The cockpit, and beside it the margin rows its Pressure gauge opens plus
                    the Backing pool its Backing gauge grades. */}
                <div className={positionsUi.bandGrid}>
                  <BookVsBaseCockpit
                    book={book.alarm.book}
                    checks={book.alarm.checks}
                    cushionTightPct={cushionTightPct}
                    onOpenTarget={openTarget}
                    headerLink={{ to: backingHref({ scopeSearch, anchor: 'model' }), label: 'Model →' }}
                    spotMix={book.alarm.spotMix}
                    explain={explain}
                    room={room}
                  />
                  <div className="grid min-w-0 grid-cols-1 gap-3">
                    <MarginByAccountStrip
                      margin={book.marginAllAccounts}
                      hostId={book.hostAccountId}
                      secondaryId={book.secondaryAccountId}
                      accountFilter={accountFilter}
                      positions={book.allPositions}
                      resolveSpot={book.alarm.resolveSpot}
                    />
                    <BackingPoolCard
                      variant="summary"
                      book={book.alarm.book}
                      onSegmentClick={openFromBackingSegment}
                      backingLink={{ to: backingHref({ scopeSearch }), label: 'Backing & Model →' }}
                    />
                  </div>
                </div>

                <PositionsTier
                  label="Pressure points"
                  note="which leg is closest to being run over, and what is still sellable"
                  open={pressureOpen}
                  onToggle={() => setPressureOpen((v) => !v)}
                />
                {pressureOpen ? (
                  <div className={positionsUi.bandGrid}>
                    <ShortLegsPanel
                      legs={book.riskLegs}
                      tightPct={cushionTightPct}
                      activeExpiry={activeExpiry}
                      activeSymbol={filterSymbol}
                      onExpiryClick={toggleExpiryScope}
                      onUnpricedClick={() => openTarget('ladder')}
                      onScopeSymbol={setFilterSymbol}
                      onClearSymbol={() => setFilterSymbol('')}
                      selected={selectedLeg}
                      onSelect={setPickedLeg}
                    />
                    <div className="min-w-0">
                      <RoomToAddSection room={roomFull} coverRows={book.coverRows} ceiling={ceiling} onLevelChange={setLevel} />
                    </div>
                  </div>
                ) : null}

                <PositionsTier label="Lines" note="the rows themselves, tightest first · one thing at a time opens on the right" />
                <div id="positions-lines" className="min-w-0">
                  <LinesToolbar
                    view={linesView}
                    onViewChange={setLinesView}
                    detailViewMode={detailViewMode}
                    onDetailViewModeChange={setDetailViewMode}
                    structureTypes={book.instanceFilterOptions.structureTypes}
                    oppNames={book.instanceFilterOptions.oppNames}
                    scopeTypes={book.instanceFilterOptions.scopeTypes}
                    values={instanceFilters}
                    onChange={setInstanceFilters}
                    shown={filteredInstanceGroups.length}
                    total={book.instanceAllGroups.length}
                    expiryCount={expiriesInView.length}
                    selectionLabel={selectedLeg ? riskMapLegShort(selectedLeg) : null}
                    onClearSelection={() => setPickedLeg(null)}
                  />
                  {linesView === 'strategy' ? (
                    <InstanceTab
                      groups={filteredInstanceGroups}
                      totalInstanceCount={book.instanceAllGroups.length}
                      quotesBySymbol={book.quotesBySymbol}
                      resolveSpot={book.alarm.resolveSpot}
                      quotesByCk={book.quotesByCk}
                      benchBySymbol={book.benchBySymbol}
                      liveStocks={book.allStocks}
                      executionsFinal={book.executionsFinal}
                      executionsTws={book.executionsTws}
                      opportunities={book.opportunities}
                      structures={book.structures}
                      attributions={book.attributions}
                      instanceStructureById={book.instanceStructureById}
                      portfolioAccounts={book.accounts}
                      greeksByTicker={book.greeks.byTicker}
                      detailViewMode={detailViewMode}
                      onEditExec={requestEditExec}
                      onLinkExec={openLinkExec}
                      onDeleteExec={setDeleteTarget}
                      onRefreshExecs={refreshExecData}
                      onOpenStrategy={(id) => setInspector({ type: 'strategy', id })}
                      canonicalOptContractKeys={book.canonicalOptContractKeys}
                      onOpenStock={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
                      onOpenOption={(pos) =>
                        setInspector({ type: 'option', contractKey: pos.contract_key, optionPosition: pos })
                      }
                    />
                  ) : linesView === 'contract' ? (
                    <OptionsTab
                      positions={contractsInView}
                      quotesBySymbol={book.quotesBySymbol}
                      quotesByCk={book.quotesByCk}
                      filterSymbol={filterSymbol}
                      filterExpiry={filterExpiry}
                      executionsFinal={book.executionsFinal}
                      executionsTws={book.executionsTws}
                      detailViewMode={detailViewMode}
                      onEditExec={requestEditExec}
                      onLinkExec={openLinkExec}
                      onDeleteExec={setDeleteTarget}
                      onCloseExec={(exec, netQty) => setCloseTarget({ exec, netQty })}
                      onRefreshExecs={refreshExecData}
                      canonicalOptContractKeys={book.canonicalOptContractKeys}
                      onInspect={(pos) => setInspector({ type: 'option', contractKey: pos.contract_key, optionPosition: pos })}
                      onOpenStrategy={(id) => setInspector({ type: 'strategy', id })}
                    />
                  ) : (
                    <ExpiriesView
                      rows={expiriesInView}
                      quotesBySymbol={book.quotesBySymbol}
                      cushionTightPct={cushionTightPct}
                      activeExpiry={activeExpiry}
                      onExpiryClick={toggleExpiryScope}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>

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
        accountOptions={book.accountOptions}
        onClose={() => setEditExec(null)}
        onSuccess={refreshExecData}
      />
      <LinkExecutionModal
        key={linkContext?.account_executions_id ?? 'link-form'}
        open={!!linkContext}
        context={linkContext}
        opportunities={book.opportunities}
        onClose={() => setLinkContext(null)}
        onSuccess={refreshExecData}
      />
      <QuickCloseModal
        exec={closeTarget?.exec ?? null}
        netQty={closeTarget?.netQty}
        onClose={() => setCloseTarget(null)}
        onSuccess={refreshExecData}
      />
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
      <RightInspectorShell
        open={Boolean(openOptionPosition)}
        ariaLabel="Option contract detail"
        onClose={closeInspector}
      >
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
      </RightInspectorShell>
    </PageShell>
  )
}
