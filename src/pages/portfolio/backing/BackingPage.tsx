/**
 * Backing & Model — what the options need, what backs them, what is left, and
 * what the market can do to the book.
 *
 * The Owner's original question for this book, on its own screen: the base
 * (stocks, income ETFs, cash and SGOV) against the obligations the short
 * options can force, per account and symbol. Same scope, same derivation as
 * Positions — the URL carries the scope across, and the Backing and Potential
 * gauges here are the ones on the Positions cockpit. Under that, the model
 * band: core's hypothetical stress and return-on-risk for one account, the
 * other half of the same add-or-not decision. `?symbol=` narrows the book and
 * opens that symbol's model row — the drill-down the rest of the app links to.
 */
import { useEffect, useMemo, useState } from 'react'
import { RoomToAddSection } from '@/components/positions/RoomToAddSection'
import { computeRoomToAdd, summarizeRoom } from '@/utils/roomToAdd'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { usePositionsScope } from '@/hooks/usePositionsScope'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { ViewState } from '@bifrost/ui'
import { PageHead, PageHeadLink, PageShell, SectionHead } from '@/components/layout'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/data-display'
import { PositionsOpenControls } from '@/components/positions/PositionsOpenControls'
import { BookVsBaseCockpit } from '@/components/positions/BookVsBaseCockpit'
import { MarginByAccountStrip } from '@/components/positions/MarginByAccountStrip'
import { BackingPoolCard } from '@/components/positions/charts/BackingPoolCard'
import { ObligationsRoomSection } from '@/components/positions/ObligationsRoomSection'
import { BaseHoldingsSection } from '@/components/positions/BaseHoldingsSection'
import { InspectorDrawer, type InspectorState } from '@/components/positions/InspectorDrawer'
import { sortObligations, type ObligationsSort } from '@/utils/obligationsRoom'
import {
  BACKING_ANCHOR_ID,
  BACKING_TARGET_ANCHOR,
  backingAnchorId,
  isBackingTarget,
} from '@/utils/backingAnchors'
import { POSITIONS_PATH } from '@/utils/portfolioLinks'
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'
import { ModelBandSection } from './model/ModelBandSection'
import { useModelBand } from './model/useModelBand'
import { BackingVerdictPanel } from './BackingVerdictPanel'
import { positionsUi } from '@/components/positions/positionsUi'
import { BookFetchMarker } from '@/components/positions/BookFetchMarker'
import { PlanReservesSection } from './PlanReservesSection'
import { BackingFaceSlot, type BackingFace, type SymbolFace } from './BackingFaceSlot'
import { backingPoolUsage, deriveBackingJudgment } from '@/utils/backingJudgment'

const SORTS: readonly ObligationsSort[] = ['cash', 'calls', 'spare', 'symbol']

/** Who reads this page's figures, and what each of them may not recompute. */
const BACKING_CITATIONS = [
  {
    what: 'Backing used, the 85% house gate, the space under it',
    note: 'Risk › Portfolio Exposure cites these; its gate hit point stays unknown until this page computes one.',
    label: 'Risk Portfolio →',
    to: '/risk/portfolio',
  },
  {
    what: 'Account Cushion and pressure',
    note: 'Risk › Margin adds the per-position view once the broker reports it. Same three rulers, one computation.',
    label: 'Risk Margin →',
    to: '/risk/margin',
  },
  {
    what: 'Space under the gate, as a sizing budget',
    note: 'Risk › Sizing spends this number; it never recomputes it.',
    label: 'Risk Sizing →',
    to: '/risk/sizing',
  },
] as const

export default function BackingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { scope, setAccountFilter, setFilterSymbol, setFilterExpiry, scopeSearch } =
    usePositionsScope()
  const { accountFilter, filterSymbol, filterExpiry } = scope
  const { pct: cushionTightPct, setPct: setCushionTightPct } = useCushionThreshold()
  const book = usePositionsBook(scope, cushionTightPct)

  // A gauge on Positions can arrive here asking for a sort; after that the reader owns it.
  const [sort, setSort] = useState<ObligationsSort>(() => {
    const s = searchParams.get('sort') as ObligationsSort | null
    return s && SORTS.includes(s) ? s : 'cash'
  })
  const [obligationsOpen, setObligationsOpen] = useState(true)
  const [holdingsOpen, setHoldingsOpen] = useState(true)
  const { ceiling, setLevel } = usePressureCeiling()
  const room = useMemo(
    () =>
      computeRoomToAdd({
        book: book.alarm.book,
        margin: book.alarm.margin,
        legs: book.alarm.legs,
        coverRows: book.coverRows,
        resolveSpot: book.alarm.resolveSpot,
        ceiling,
      }),
    [
      book.alarm.book,
      book.alarm.margin,
      book.alarm.legs,
      book.coverRows,
      book.alarm.resolveSpot,
      ceiling,
    ]
  )
  const roomSummary = useMemo(() => summarizeRoom(room), [room])
  const judgment = useMemo(
    () => deriveBackingJudgment(backingPoolUsage(book.alarm.book)),
    [book.alarm.book]
  )
  const [inspector, setInspector] = useState<InspectorState>({ type: null })
  /** One symbol held in both tables at once — the obligation row and the shares behind it. */
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null)
  // The slot beside the page: a modelled symbol's CAR and stress, or the symbol in focus.
  const [face, setFace] = useState<BackingFace>('symbol')
  const [slotOpen, setSlotOpen] = useState(false)

  const rows = useMemo(
    () => sortObligations(book.obligationsRows, sort),
    [book.obligationsRows, sort]
  )
  const focusCounts = useMemo(() => {
    if (!focusSymbol) return { obligations: 0, holdings: 0 }
    const same = (s: string | null | undefined) => (s ?? '').toUpperCase() === focusSymbol
    return {
      obligations: rows.filter((r) => same(r.symbol)).length,
      holdings: [...book.coreStocks, ...book.fixedIncomeStocks, ...book.cashLikeStocks].filter((p) => same(p.symbol))
        .length,
    }
  }, [focusSymbol, rows, book.coreStocks, book.fixedIncomeStocks, book.cashLikeStocks])
  const model = useModelBand(scope)
  const modelEntry = useMemo(
    () => (model.table.expandedSymbol ? (model.data?.per_underlying ?? []).find((u) => u.symbol === model.table.expandedSymbol) ?? null : null),
    [model.data, model.table.expandedSymbol],
  )
  const openSymbolFace = (symbol: string) => {
    setFocusSymbol(symbol.toUpperCase())
    setFace('symbol')
    setSlotOpen(true)
  }
  const openModelFace = (symbol: string) => {
    if (model.table.expandedSymbol !== symbol) model.table.onToggleSymbol(symbol)
    setFace('model')
    setSlotOpen(true)
  }
  const symbolFace: SymbolFace | null = focusSymbol
    ? {
        symbol: focusSymbol,
        rows: [...book.coreStocks, ...book.fixedIncomeStocks, ...book.cashLikeStocks].filter(
          (p) => (p.symbol ?? '').toUpperCase() === focusSymbol,
        ),
        role:
          book.alarm.book.base.find((l) =>
            (l.role === 'stocks' ? book.coreStocks : l.role === 'income' ? book.fixedIncomeStocks : book.cashLikeStocks).some(
              (p) => (p.symbol ?? '').toUpperCase() === focusSymbol,
            ),
          )?.note ?? null,
        positionsHref: `${POSITIONS_PATH}?symbol=${encodeURIComponent(focusSymbol)}`,
        onOpenModel: (model.data?.per_underlying ?? []).some((u) => u.symbol.toUpperCase() === focusSymbol)
          ? () => openModelFace((model.data?.per_underlying ?? []).find((u) => u.symbol.toUpperCase() === focusSymbol)!.symbol)
          : undefined,
        onOpenStock: () => setInspector({ type: 'stock', symbol: focusSymbol }),
      }
    : null

  // #obligations / #holdings / #room / #model from a link: scroll once the tables exist.
  useEffect(() => {
    const id = backingAnchorId(location.hash)
    if (!id || book.isLoading) return
    const t = window.setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ block: 'start' }),
      50
    )
    return () => window.clearTimeout(t)
  }, [location.hash, book.isLoading])

  const positionsHref = `${POSITIONS_PATH}${scopeSearch ? `?${scopeSearch}` : ''}`
  const openTarget = (t: AlarmTarget) => {
    if (isBackingTarget(t)) {
      document
        .getElementById(BACKING_ANCHOR_ID[BACKING_TARGET_ANCHOR[t]])
        ?.scrollIntoView({ block: 'start' })
    } else if (t === 'margin') {
      document.getElementById('positions-margin')?.scrollIntoView({ block: 'nearest' })
    } else {
      navigate(positionsHref)
    }
  }

  const scopedCount = book.hasAccountSelection ? book.totalPositions : 0

  // The header and the model band render whatever the book is doing: the band
  // reads none of it, and #model has to exist while the book loads or fails.
  const backingBody = book.isLoading ? (
    <section className={positionsUi.panel}>
      <ViewState kind="loading" title="Loading the book" rows={8} cols={6} />
    </section>
  ) : book.isError ? (
    <section className={positionsUi.panel}>
      <ViewState
        kind="failed"
        title="Couldn’t load the book"
        detail={`${(book.error as Error)?.message ?? 'The monitor did not answer'}. Nothing below was evaluated — not an empty book.`}
      />
    </section>
  ) : !book.showOpenPositionsPanel ? (
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
      />

      {!book.hasAccountSelection ? (
        <EmptyState
          title="Select an account"
          description="Turn on HOST and/or Secondary above to show the base for those accounts."
        />
      ) : (
        <>
          <SectionHead note="One glance, then the model that produced it.">Verdict</SectionHead>
          <BackingVerdictPanel judgment={judgment} pressureCeiling={ceiling} />

          <SectionHead note="Same two gauges as the Positions cockpit — one computation, read twice.">Book against the base</SectionHead>
          <div className={positionsUi.bandGrid}>
            <div className="grid min-w-0 grid-cols-1 gap-3">
              <BookVsBaseCockpit
                variant="backing"
                book={book.alarm.book}
                cushionTightPct={cushionTightPct}
                onOpenTarget={(t, s) => {
                  if (s) setSort(s)
                  openTarget(t)
                }}
                headerLink={{ to: positionsHref, label: 'Positions →' }}
                explain={{
                  exposure: book.alarm.exposure,
                  margin: book.alarm.margin,
                  accounts: book.scopedAccounts,
                  cashLikeRows: book.cashLikeStocks,
                  coverRows: book.coverRows,
                  room: roomSummary,
                }}
                room={roomSummary}
              />
              <MarginByAccountStrip
                margin={book.marginAllAccounts}
                hostId={book.hostAccountId}
                secondaryId={book.secondaryAccountId}
                accountFilter={accountFilter}
                positions={book.allPositions}
                resolveSpot={book.alarm.resolveSpot}
              />
            </div>
            <section className={positionsUi.panel} aria-label="Backing pool">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Backing pool</span>
                <span className={positionsUi.panelTitle}>three roles, one pool</span>
                <span className={cn(positionsUi.panelNote, 'ml-auto')}>click a role → its rows below</span>
              </header>
              <BackingPoolCard
                book={book.alarm.book}
                onSegmentClick={(target) => {
                  if (target === 'income') openTarget('independent')
                  else {
                    setSort(target === 'puts' ? 'cash' : target === 'free' ? 'spare' : 'calls')
                    openTarget('coverage')
                  }
                }}
              />
            </section>
          </div>

          <SectionHead note="Page estimates from the book’s own numbers, not the broker’s what-if.">Room to add</SectionHead>
          <div id={BACKING_ANCHOR_ID.room}>
            <RoomToAddSection
              room={room}
              coverRows={book.coverRows}
              ceiling={ceiling}
              onLevelChange={setLevel}
            />
          </div>
          <SectionHead note="Two sides of the same symbols — what the options can force, and what is standing behind it.">Obligations and base</SectionHead>
          <section className={positionsUi.panel} aria-label="Obligations and base">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-3 py-1.5">
              <span className={positionsUi.cap}>Focus</span>
              {focusSymbol ? (
                <>
                  <span className={cn(positionsUi.mono, 'text-dense-body font-bold text-entity-symbol')}>
                    {focusSymbol}
                  </span>
                  <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground')}>
                    {focusCounts.obligations} obligation {focusCounts.obligations === 1 ? 'row' : 'rows'} ·{' '}
                    {focusCounts.holdings} {focusCounts.holdings === 1 ? 'holding' : 'holdings'}
                  </span>
                  <button type="button" className={positionsUi.link} onClick={() => setFocusSymbol(null)}>
                    clear
                  </button>
                </>
              ) : (
                <span className={positionsUi.panelNote}>
                  click any symbol to hold it in both tables at once — the obligation row and the shares behind it
                </span>
              )}
            </div>
          <div id={BACKING_ANCHOR_ID.obligations} className="border-b border-border">
            <ObligationsRoomSection
              open={obligationsOpen}
              onToggle={() => setObligationsOpen((v) => !v)}
              rows={rows}
              exposure={book.alarm.exposure}
              coverRatio={book.alarm.coverRatio}
              moreCalls={book.alarm.book.potential.moreCalls}
              cashLikeTotal={book.alarm.book.backing.cashLike}
              buyingPower={book.alarm.book.supply.buyingPower}
              sort={sort}
              onSortChange={setSort}
              focusSymbol={focusSymbol}
              onSymbolClick={(symbol) => openSymbolFace(symbol)}
              onNakedClick={(symbol) => setFilterSymbol(symbol)}
            />
          </div>
          <div id={BACKING_ANCHOR_ID.holdings}>
            <BaseHoldingsSection
              open={holdingsOpen}
              onToggle={() => setHoldingsOpen((v) => !v)}
              layers={book.alarm.book.base}
              coreStocks={book.coreStocks}
              incomeEtfs={book.fixedIncomeStocks}
              cashLike={book.cashLikeStocks}
              filterSymbol={filterSymbol}
              focusSymbol={focusSymbol}
              onInspectStock={(pos) => openSymbolFace(pos.symbol ?? '')}
            />
          </div>
          </section>
          <PlanReservesSection />
        </>
      )}
    </>
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <div
        className={cn(
          'grid min-w-0 items-start gap-3',
          slotOpen ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(26.25rem,38%)]' : 'grid-cols-1',
        )}
      >
      <section className="flex min-w-0 flex-col gap-3" aria-label="Backing and model">
        {/* §16.10: the lead behind ⓘ, the snapshot's age as the stamp, the
            position count as meta, the way back to Positions as the door. */}
        <PageHead
          title="Backing & Model"
          info="What the options need, what backs them, what is left to sell against — and what the market can do to the book."
          stamp={<BookFetchMarker quiet />}
          meta={
            book.portfolioPositionCount > 0 ? `${scopedCount} position${scopedCount !== 1 ? 's' : ''}` : undefined
          }
          actions={
            <PageHeadLink to={positionsHref} title="Back to Positions">
              ← Positions
            </PageHeadLink>
          }
        />

        {backingBody}

        {/* The design's Cited elsewhere: who reads this page's figures. Written down
            because a number with a second computation somewhere else is how two pages
            start disagreeing — each row names the reader and what it may not redo. */}
        <section className={positionsUi.panel} aria-label="Cited elsewhere">
          <header className={positionsUi.panelHead}>
            <span className={positionsUi.cap}>Cited elsewhere</span>
            <span className={positionsUi.panelTitle}>who reads these numbers</span>
          </header>
          {BACKING_CITATIONS.map((c) => (
            <div
              key={c.to}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border/55 px-3 py-1.5 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-dense-body leading-normal text-foreground">{c.what}</span>
                <span className={cn(positionsUi.panelNote, 'text-pretty')}>{c.note}</span>
              </span>
              <Link to={c.to} className={positionsUi.link}>
                {c.label}
              </Link>
            </div>
          ))}
        </section>

        <SectionHead note="Hypothetical · one account at a time, never summed.">Model</SectionHead>
        <div id={BACKING_ANCHOR_ID.model}>
          <ModelBandSection
            {...model}
            table={{
              ...model.table,
              onToggleSymbol: (symbol) => {
                model.table.onToggleSymbol(symbol)
                setFace('model')
                setSlotOpen(model.table.expandedSymbol !== symbol)
              },
            }}
          />
        </div>
      </section>
      {slotOpen ? (
        <BackingFaceSlot
          face={face}
          onFace={setFace}
          onClose={() => setSlotOpen(false)}
          entry={modelEntry}
          accountLabel={model.account.accountId}
          symbol={symbolFace}
        />
      ) : null}
      </div>

      <InspectorDrawer state={inspector} onClose={() => setInspector({ type: null })} />
    </PageShell>
  )
}
