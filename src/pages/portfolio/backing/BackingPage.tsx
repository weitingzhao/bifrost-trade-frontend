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
import { PageHeader, PageShell } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EmptyState } from '@/components/data-display'
import { PositionsOpenControls } from '@/components/positions/PositionsOpenControls'
import { BookVsBaseCockpit } from '@/components/positions/BookVsBaseCockpit'
import { MarginByAccountStrip } from '@/components/positions/MarginByAccountStrip'
import { BackingPoolCard } from '@/components/positions/charts/BackingPoolCard'
import { ObligationsRoomSection } from '@/components/positions/ObligationsRoomSection'
import { BaseHoldingsSection } from '@/components/positions/BaseHoldingsSection'
import { InspectorDrawer, type InspectorState } from '@/components/positions/InspectorDrawer'
import styles from '@/components/positions/PositionsChartsSection.module.css'
import { sortObligations, type ObligationsSort } from '@/utils/obligationsRoom'
import { BACKING_ANCHOR_ID, BACKING_TARGET_ANCHOR, backingAnchorId, isBackingTarget } from '@/utils/backingAnchors'
import { POSITIONS_PATH } from '@/utils/portfolioLinks'
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'
import { ModelBandSection } from './model/ModelBandSection'
import { useModelBand } from './model/useModelBand'

const SORTS: readonly ObligationsSort[] = ['cash', 'calls', 'spare', 'symbol']

export default function BackingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { scope, setAccountFilter, setFilterSymbol, setFilterExpiry, scopeSearch } = usePositionsScope()
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
    [book.alarm.book, book.alarm.margin, book.alarm.legs, book.coverRows, book.alarm.resolveSpot, ceiling],
  )
  const roomSummary = useMemo(() => summarizeRoom(room), [room])
  const [inspector, setInspector] = useState<InspectorState>({ type: null })

  const rows = useMemo(() => sortObligations(book.obligationsRows, sort), [book.obligationsRows, sort])
  const model = useModelBand(scope)

  // #obligations / #holdings / #room / #model from a link: scroll once the tables exist.
  useEffect(() => {
    const id = backingAnchorId(location.hash)
    if (!id || book.isLoading) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(t)
  }, [location.hash, book.isLoading])

  const positionsHref = `${POSITIONS_PATH}${scopeSearch ? `?${scopeSearch}` : ''}`
  const openTarget = (t: AlarmTarget) => {
    if (isBackingTarget(t)) {
      document.getElementById(BACKING_ANCHOR_ID[BACKING_TARGET_ANCHOR[t]])?.scrollIntoView({ block: 'start' })
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
    <div className="space-y-3">
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  ) : book.isError ? (
    <Alert variant="destructive">
      <AlertDescription>{(book.error as Error).message}</AlertDescription>
    </Alert>
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
            <div className="min-w-0 space-y-3">
              <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <BookVsBaseCockpit
                    variant="backing"
                    book={book.alarm.book}
                    checks={book.alarm.checks}
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
                <section className={styles.panel} aria-label="Backing pool">
                  <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
                    Backing pool
                  </span>
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

              <div id={BACKING_ANCHOR_ID.room}>
                <RoomToAddSection room={room} coverRows={book.coverRows} ceiling={ceiling} onLevelChange={setLevel} />
              </div>
              <div id={BACKING_ANCHOR_ID.obligations}>
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
                  onSymbolClick={(symbol, accountId) => setInspector({ type: 'stock', symbol, accountId })}
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
            </div>
          )}
        </>
      )

  return (
    <PageShell className="space-y-3">
      <PageHeader
        title="Backing & Model"
        description="What the options need, what backs them, what is left to sell against — and what the market can do to the book."
        actions={
          <div className="flex items-center gap-2">
            {book.portfolioPositionCount > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {scopedCount} position{scopedCount !== 1 ? 's' : ''}
              </Badge>
            ) : null}
            <Link to={positionsHref} className="text-dense-body text-link hover:underline">
              ← Positions
            </Link>
          </div>
        }
      />

      {backingBody}

      <div id={BACKING_ANCHOR_ID.model}>
        <ModelBandSection {...model} />
      </div>

      <InspectorDrawer state={inspector} onClose={() => setInspector({ type: null })} />
    </PageShell>
  )
}
