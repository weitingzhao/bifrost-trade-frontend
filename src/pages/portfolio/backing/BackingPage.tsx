/**
 * Backing — what the options need, what backs them, and what is left.
 *
 * The Owner's original question for this book, on its own screen: the base
 * (stocks, income ETFs, cash and SGOV) against the obligations the short
 * options can force, per account and symbol. Same scope, same derivation as
 * Positions — the URL carries the scope across, and the Backing and Potential
 * gauges here are the ones on the Positions cockpit. Nothing here is folded
 * away: the two tables are the page.
 */
import { useEffect, useMemo, useState } from 'react'
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
import type { AlarmTarget } from '@/hooks/usePositionsAlarm'

const POSITIONS_PATH = '/portfolio/positions'
const SORTS: readonly ObligationsSort[] = ['cash', 'calls', 'spare', 'symbol']

const ANCHOR: Record<'coverage' | 'independent', string> = {
  coverage: 'backing-obligations',
  independent: 'backing-holdings',
}

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
  const [inspector, setInspector] = useState<InspectorState>({ type: null })

  const rows = useMemo(() => sortObligations(book.obligationsRows, sort), [book.obligationsRows, sort])

  // #obligations / #holdings from a Positions gauge: scroll once the tables exist.
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    const id = hash === 'obligations' ? ANCHOR.coverage : hash === 'holdings' ? ANCHOR.independent : null
    if (!id || book.isLoading) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(t)
  }, [location.hash, book.isLoading])

  const openTarget = (t: AlarmTarget) => {
    if (t === 'coverage' || t === 'independent') {
      document.getElementById(ANCHOR[t])?.scrollIntoView({ block: 'start' })
    } else if (t === 'margin') {
      document.getElementById('positions-margin')?.scrollIntoView({ block: 'nearest' })
    } else {
      navigate(`${POSITIONS_PATH}${scopeSearch ? `?${scopeSearch}` : ''}`)
    }
  }

  if (book.isLoading) {
    return (
      <PageShell className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 rounded-lg" />
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
  const positionsHref = `${POSITIONS_PATH}${scopeSearch ? `?${scopeSearch}` : ''}`

  return (
    <PageShell className="space-y-3">
      <PageHeader
        title="Backing"
        description="What the options need, what backs them, and what is left to sell against — per account and symbol."
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
                  />
                  <MarginByAccountStrip
                    margin={book.marginAllAccounts}
                    hostId={book.hostAccountId}
                    secondaryId={book.secondaryAccountId}
                    accountFilter={accountFilter}
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

              <div id={ANCHOR.coverage}>
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
              <div id={ANCHOR.independent}>
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
      )}

      <InspectorDrawer state={inspector} onClose={() => setInspector({ type: null })} />
    </PageShell>
  )
}
