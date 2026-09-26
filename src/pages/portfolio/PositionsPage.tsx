/**
 * Positions — what is in the book and where it is tight.
 *
 * One screen, one question. The scope bar decides what the page is about;
 * the hero band grades the book in four readings; the cockpit sets demand
 * beside supply and the Backing pool pictures the base; the grid ranks the
 * lines by danger, in three views (strategies, contracts, expiries). What the
 * options need and what backs them is the next page — Backing — reached from
 * the readings and the pool, with the same scope.
 *
 * The §16 north-star page (design Rev 2026-09-23.21): explanations live in
 * titles, honesty stays printed, and nothing the page could do before was cut.
 */
import { useState, useMemo, useCallback } from 'react'
import { usePageViewParams, usePageViewState } from '@/lib/pageView'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { usePersistedChoice } from '@/hooks/usePersistedChoice'
import { usePositionsScope } from '@/hooks/usePositionsScope'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { STORAGE_KEYS } from '@/constants/storage'
import { deleteExecution } from '@/api/trading'
import { PageHead, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cn } from '@/lib/utils'
import { ViewState } from '@bifrost/ui'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
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
import { BookHeroBand } from './positions/BookHeroBand'
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
import {
  PositionsFaceSlot,
  type FaceRisk,
  type LedgerMode,
  type PositionsFace,
} from '@/components/positions/PositionsFaceSlot'
import { buildDiscoveryUrl } from '@/utils/optionDiscovery/discoveryNav'
import { readInstances } from '@/utils/strategyInstances'
import { filterInstanceGroups } from '@/utils/filterInstanceGroups'
import { sortInstanceGroupOptions } from '@/utils/instanceGroupSort'
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { computeRoomToAdd, summarizeRoom } from '@/utils/roomToAdd'
import { instanceGroupKey } from '@/utils/instanceSheetExec'
import { riskMapLegShort, type RiskMapLeg } from '@/utils/shortLegRiskMap'
import type { ObligationsSort } from '@/utils/obligationsRoom'
import type { Execution, OpenOptionPosition } from '@/types/positions'
import type { RiskProfile } from '@/utils/riskProfile'
import { BACKING_TARGET_ANCHOR, backingHref, isBackingTarget } from '@/utils/backingAnchors'

/** The page's own URL view (Rev .75): the expiry. Account and symbol are the shell's. */
const POSITIONS_VIEW_PARAMS = ['expiry'] as const

export default function PositionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Scope: the one set of choices the whole page is about, kept in the URL.
  // Positions follows the shell's account scope (Rev .58); its own toggles
  // write it.
  const { scope, setAccountFilter, setFilterSymbol, setFilterExpiry, resetScope, scopeSearch } = usePositionsScope({
    followAccount: true,
  })
  const { accountFilter, filterSymbol, filterExpiry } = scope
  const { pct: cushionTightPct, setPct: setCushionTightPct } = useCushionThreshold()
  const book = usePositionsBook(scope, cushionTightPct)
  const statusQ = useMonitorStatus()
  const preview = usePreviewState()

  // Grid-only state: changes what the grid shows, never what the cockpit grades.
  // The view and the expand mode are remembered across sessions; the filters,
  // the pressure fold, the face and the expiry for this tab's session (design
  // Rev .75 view state, the page it was drawn on).
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
  const [instanceFilters, setInstanceFilters] = usePageViewState<InstanceFilterValues>('filters', CLEAR_FILTERS)
  usePageViewParams(POSITIONS_VIEW_PARAMS)
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
  /**
   * The instance sheet, addressable.
   *
   * `?instance=<id>` opens it on any instance, open or closed — the sidebar
   * fetches the record itself rather than reading the open book. Without this
   * the sheet could only be reached by clicking a row in the open book, which
   * left every closed instance's history with no entrance at all once Strategy
   * › Instances (which had `?instance=`) retires. Trade › Rules links here.
   */
  const [params, setParams] = useSearchParams()
  const instanceParam = Number(params.get('instance'))
  const urlInstanceId = Number.isFinite(instanceParam) && instanceParam > 0 ? instanceParam : null
  const vsParam = Number(params.get('vs'))
  const urlCompareId = Number.isFinite(vsParam) && vsParam > 0 ? vsParam : null
  const [inspector, setInspector] = useState<InspectorState>(
    urlInstanceId == null
      ? { type: null }
      : { type: 'strategy', id: urlInstanceId, compareId: urlCompareId },
  )
  const [pressureOpen, setPressureOpen] = usePageViewState('pressure', true)
  // The one slot beside the grid: one thing at a time, on the face that answers it.
  // Which face is kept; the open slot is not — it holds a picked contract,
  // leg or fill, which is data, and reopens on the next pick.
  const [face, setFace] = usePageViewState<PositionsFace>('face', 'risk')
  const [faceOpen, setFaceOpen] = useState(false)
  const [faceContract, setFaceContract] = useState<OpenOptionPosition | null>(null)
  const [faceRisk, setFaceRisk] = useState<FaceRisk | null>(null)
  const [faceExec, setFaceExec] = useState<Execution | null>(null)
  const closeInspector = () => {
    setInspector({ type: null })
    if (urlInstanceId != null) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('instance')
          next.delete('vs')
          return next
        },
        { replace: true },
      )
    }
  }

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
    [navigate, scopeSearch, setLinesView, setPressureOpen],
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

  const openContractFace = useCallback((pos: OpenOptionPosition) => {
    setFaceContract(pos)
    setFace('contract')
    setFaceOpen(true)
  }, [setFace])
  const instanceById = useMemo(
    () => new Map(book.instances.map((i) => [i.strategy_instance_id, i])),
    [book.instances],
  )
  const openRiskFace = useCallback(
    (id: number, ctx?: { title: string; profile: RiskProfile | null }) => {
      // running / closed by the Ledger's own rule, on this instance's own
      // fills — the sheet renames it, it never writes its state.
      const record = instanceById.get(id)
      const reading = record ? readInstances([record], book.executionsFinal)[0] : null
      setFaceRisk({
        title: ctx?.title ?? `Strategy #${id}`,
        profile: ctx?.profile ?? null,
        onOpenInstance: () => setInspector({ type: 'strategy', id }),
        instance:
          record && reading
            ? { id, label: record.label ?? '', status: reading.closed ? 'closed' : 'running' }
            : null,
      })
      setFace('risk')
      setFaceOpen(true)
    },
    [instanceById, book.executionsFinal, setFace],
  )
  /** A face button runs the write it names, on the fill the face is about. */
  const openLedgerMode = useCallback(
    (mode: LedgerMode) => {
      const ex = faceExec
      if (!ex) return
      if (mode === 'edit') setEditExecConfirm({ open: true, exec: ex })
      else if (mode === 'close') setCloseTarget({ exec: ex, netQty: Math.abs(Number(ex.quantity ?? ex.qty ?? 0)) })
      else if (mode === 'delete') setDeleteTarget(ex)
      else if (ex.account_executions_id != null) setLinkContext({ account_executions_id: ex.account_executions_id, execution: ex })
    },
    [faceExec],
  )

  const openLedgerFace = useCallback((exec: Execution) => {
    setFaceExec(exec)
    setFace('ledger')
    setFaceOpen(true)
  }, [setFace])

  const openOptionPosition = faceContract
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
  const faceSubject = faceExec
    ? [
        faceExec.account_executions_id != null ? `exec #${faceExec.account_executions_id}` : 'fill',
        faceExec.symbol,
        faceExec.strategy_instance_id != null ? `strategy #${faceExec.strategy_instance_id}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  function refreshExecData() {
    queryClient.invalidateQueries({ queryKey: ['trading', 'executions'] })
    queryClient.invalidateQueries({ queryKey: ['trading', 'position-attribution'] })
  }
  function requestEditExec(ex: Execution) {
    openLedgerFace(ex)
    setEditExecConfirm({ open: true, exec: ex })
  }
  function openLinkExec(ex: Execution, sameContractTrades?: Execution[]) {
    const execId = ex.account_executions_id
    if (execId == null) return
    openLedgerFace(ex)
    const peerPicks =
      sameContractTrades?.length && sameContractTrades.length > 0 ? collectPeerInstancePicks(sameContractTrades, execId) : []
    setLinkContext({
      account_executions_id: execId,
      execution: ex,
      ...(peerPicks.length > 0 ? { peer_instance_picks: peerPicks } : {}),
    })
  }

  // §17.1: the head and the toolbar never wait for data — only the data
  // region yields. The book's one source is the monitor's status read
  // (accounts and positions); `usePositionsBook` already made it.
  const bookSource =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const retryBook = () => void statusQ.refetch()
  // §17.3 / §17.1-7: Clear resets every axis that can empty the book here, not
  // only the one that did — both accounts back, any symbol, any expiry.
  const scopeOn = [
    !(accountFilter.host && accountFilter.secondary) && 'accounts',
    filterSymbol.trim() && 'symbol',
    filterExpiry.trim() && 'expiry',
  ].filter((x): x is string => typeof x === 'string' && x !== '')
  const clearScope = resetScope

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

  const controls = (
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
      offTrack={accountFilter.host && accountFilter.secondary ? { count: book.offTrackCount, onOpen: openOffTrack } : null}
      scopeOn={scopeOn}
      onClearScope={clearScope}
    />
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Positions">
        {/* §16.10 sample page (Rev .32): description behind ⓘ, the fetch
            instant in the stamp slot, the count as meta; the breadcrumb is
            the top bar's. */}
        <PageHead
          title="Positions"
          info="What is in the book and where it is tight. What backs it is on the Backing page."
          stamp={<BookFetchMarker quiet />}
          meta={
            book.portfolioPositionCount > 0
              ? `${scopedCount} position${scopedCount !== 1 ? 's' : ''}${!book.hasAccountSelection ? ' (select account)' : ''}`
              : undefined
          }
          actions={
            /* Program research-copilot-reach P1 — the Copilot already has
               trade.portfolio_snapshot / portfolio_risk_summary; this hands it
               the page's live context so the user need not retype it. What
               it carries is named on hover (§16), not printed beside it. */
            <AskCopilotButton
              originPage="positions"
              title={`Carries this page snapshot: ${carries}`}
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
          }
        />

        {bookSource === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh positions"
            detail={staleDetail(statusQ, 'fills since then are not reflected.')}
            onAction={retryBook}
          />
        ) : null}

        {bookSource === 'loading' || bookSource === 'failed' ? (
          <>
            {controls}
            <section className={positionsUi.panel}>
              {bookSource === 'loading' ? (
                <ViewState kind="loading" title="Loading positions" rows={8} cols={6} />
              ) : (
                <ViewState
                  kind="failed"
                  title="Couldn’t load positions"
                  detail={failedDetail(
                    statusQ,
                    'The book was not read — an empty list here would not mean no positions.',
                  )}
                  onAction={retryBook}
                />
              )}
            </section>
          </>
        ) : !book.showOpenPositionsPanel || preview === 'empty' ? (
          <ViewState
            kind="empty"
            title="No open positions"
            detail="Position data comes from account snapshots. Ensure IB is connected and Account Sync is running."
          />
        ) : (
          <>
            {controls}

            {!book.hasAccountSelection ? (
              <ViewState
                kind="filtered"
                title="Select an account"
                detail="Both accounts are out of scope, so nothing is shown — the book itself is not empty."
                actionTitle={`Resets ${scopeOn.join(' · ')}`}
                onAction={clearScope}
              />
            ) : book.totalPositions === 0 || preview === 'filtered' ? (
              <ViewState
                kind="filtered"
                title="No positions match these filters"
                detail={`The book has positions, but none pass the current ${scopeOn.join(', ') || 'scope'}. Off-track options appear when both accounts are in scope.`}
                actionTitle={`Resets ${scopeOn.join(' · ')}`}
                onAction={clearScope}
              />
            ) : (
              <>
                {/* The four readings first — how tight, how backed, how exposed, how much room —
                    then the checks, then any How the reader opened. */}
                <BookHeroBand
                  book={book.alarm.book}
                  checks={book.alarm.checks}
                  tightPct={cushionTightPct}
                  spotMix={book.alarm.spotMix}
                  room={room}
                  explain={explain}
                  onOpenTarget={openTarget}
                />

                <PositionsTier heading label="Book" note="How tight · how backed · how exposed · how much room — in that order" />
                {/* Demand against supply — what the readings grade — then the margin rows
                    Pressure opens and the Backing pool Backing grades: three panels, one
                    height (§16.5). */}
                <div className={cn(positionsUi.band, 'sk-rise')}>
                  <div className={positionsUi.bandItem}>
                    <BookVsBaseCockpit
                      book={book.alarm.book}
                      cushionTightPct={cushionTightPct}
                      onOpenTarget={openTarget}
                      headerLink={{ to: backingHref({ scopeSearch, anchor: 'model' }), label: 'Model →' }}
                      spotMix={book.alarm.spotMix}
                      explain={explain}
                    />
                  </div>
                  <div className={positionsUi.bandItem}>
                    <MarginByAccountStrip
                      quiet
                      margin={book.marginAllAccounts}
                      hostId={book.hostAccountId}
                      secondaryId={book.secondaryAccountId}
                      accountFilter={accountFilter}
                      positions={book.allPositions}
                      resolveSpot={book.alarm.resolveSpot}
                    />
                  </div>
                  <div className={positionsUi.bandItem}>
                    <BackingPoolCard
                      variant="summary"
                      book={book.alarm.book}
                      onSegmentClick={openFromBackingSegment}
                      backingLink={{ to: backingHref({ scopeSearch }), label: 'Backing & Model →' }}
                    />
                  </div>
                </div>

                <PositionsTier
                  heading
                  label="Pressure points"
                  note="Which leg is closest to being run over, and what is still sellable"
                  open={pressureOpen}
                  onToggle={() => setPressureOpen((v) => !v)}
                />
                {pressureOpen ? (
                  <div className={cn(positionsUi.band, 'sk-rise')}>
                    <div className={positionsUi.bandItemWide}>
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
                        onOpenContract={(leg) => {
                          const pos = book.filteredOptions.find(
                            (p) => p.contract_key === leg.contractKey && (!leg.accountId || p.account_id === leg.accountId),
                          )
                          if (pos) openContractFace(pos)
                        }}
                      />
                    </div>
                    <div className={positionsUi.bandItemWide}>
                      <RoomToAddSection quiet room={roomFull} coverRows={book.coverRows} ceiling={ceiling} onLevelChange={setLevel} />
                    </div>
                  </div>
                ) : null}

                <PositionsTier heading label="Lines" note="The rows themselves, tightest first · one thing at a time opens on the right" />
                <div
                  className={cn(
                    'sk-rise grid min-w-0 items-start gap-3',
                    faceOpen ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,32.5rem),1fr))]' : 'grid-cols-1',
                  )}
                >
                <section id="positions-lines" className={positionsUi.panel} aria-label="Lines">
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
                      perShareByTicker={book.greeks.perShareByTicker}
                      detailViewMode={detailViewMode}
                      onEditExec={requestEditExec}
                      onLinkExec={openLinkExec}
                      onDeleteExec={setDeleteTarget}
                      onRefreshExecs={refreshExecData}
                      onOpenStrategy={openRiskFace}
                      canonicalOptContractKeys={book.canonicalOptContractKeys}
                      onOpenStock={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
                      onOpenOption={openContractFace}
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
                      onInspect={openContractFace}
                      onOpenStrategy={(id) => openRiskFace(id)}
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
                </section>
                {faceOpen ? (
                  <PositionsFaceSlot
                    face={face}
                    onFace={setFace}
                    onClose={() => setFaceOpen(false)}
                    contract={
                      faceContract
                        ? {
                            position: faceContract,
                            quote: book.quotesByCk[faceContract.contract_key],
                            underlyingHint: openOptionUnderlyingHint,
                            onOpenDiscovery: () => navigate(buildDiscoveryUrl(faceContract.symbol, faceContract.expiry)),
                            onEditFill: faceExec ? () => setFace('ledger') : undefined,
                          }
                        : null
                    }
                    risk={faceRisk}
                    ledger={{ subject: faceSubject, exec: faceExec, onMode: openLedgerMode }}
                  />
                ) : null}
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
    </PageShell>
  )
}
