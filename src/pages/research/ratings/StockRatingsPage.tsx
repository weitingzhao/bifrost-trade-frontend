/**
 * Ratings · Stocks — `/research/ratings/stocks`
 *
 * Built from nothing 2026-09-21 against `Research Ratings Stocks.dc.html`.
 * It is the page the Screener's **Rank by** is blocked on, and the home the
 * design gives Momentum Radar and SEPA Daily Core when they dissolve — so
 * building it moves three things at once.
 *
 * The design's sentence is the page: *"one composite, weights yours to move."*
 * A ranked list whose ranking you cannot interrogate is a number to take on
 * faith. See `stockRatingsModel.ts` for what the data allows and what it does
 * not; every column the model cannot carry is marked on the page rather than
 * drawn empty.
 */
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePageViewParams, usePageViewState } from '@/lib/pageView'
import { TodayFace } from './TodayFace'
import { useQuery } from '@tanstack/react-query'
import { MomentumFactorsPanel } from './MomentumFactorsPanel'
import { LeadersFace } from './LeadersFace'
import type { LeaderSortKey } from './leadersModel'
import {
  PageFaceSwitch,
  PageHeader,
  PageShell,
  SECTION_CAP_CLASS,
} from '@/components/layout'
import {
  SegmentControl,
  type SegmentOption,
} from '@/components/data-display'
import {
  LensSpreadPanel,
  WeightsPanel,
  presetOf,
  type LensSpread,
} from '@/components/research'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { WhyInspector } from './WhyInspector'
import { fetchSepaDaily } from '@/api/researchEngine'
import { publishSymbolTrail } from '@/lib/symbolTrail'
import {
  COLD_AT,
  HOT_AT,
  RATING_LENSES,
  SERVER_WEIGHTS,
  WEIGHT_PRESETS,
  composite,
  flagOf,
  lensSpread,
  ratingsTape,
  toRatingRow,
  ratingsStanding,
  matchesStage,
  matchesPath,
  matchesGrade,
  type StageFilter,
  type PathFilter,
  type GradeFilter,
  type RatingLensKey,
  type RatingRow,
  type RatingWeights,
} from './stockRatingsModel'

const LEAD =
  'The equity model’s daily opinion: which companies are in a tradeable trend. Trend template, growth, momentum and structure — one composite, weights yours to move. It says nothing about premium; that is the option side’s question.'

/** The page reads 500, which is the route’s own cap. */
const PAGE_LIMIT = 500

/**
 * The design's own three, in its own order — S2 leads because it is the stage
 * a trader acts in. Measured on DEV 2026-09-23: today's ranking window holds
 * only 2A and 2B, but `stage=STAGE_4` and `path=AVOID` both answer with rows
 * when asked directly, so the buttons stay — an empty result here is a fact
 * about the ranking, not about the store.
 *
 * `EXTENDED` is in the store's path enum and is not drawn: the design's bar
 * does not have it and the endpoint answers 0 for it, so a sixth button would
 * be one nothing can ever select.
 */
const STAGE_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: '2', label: 'S2', title: 'Stage 2 — 2A, 2B and 2C are phases of one stage' },
  { value: '1', label: 'S1' },
  { value: '3', label: 'S3' },
  { value: '4', label: 'S4' },
]

const PATH_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: 'sp', label: 'Setup+Pivot' },
  { value: 'PIVOT', label: 'Pivot' },
  { value: 'SETUP', label: 'Setup' },
  { value: 'WATCH', label: 'Watch' },
  { value: 'AVOID', label: 'Avoid' },
]

const VIEW_OPTIONS: SegmentOption[] = [
  { value: 'today', label: 'Today', title: "The stock model's ranking for today's session" },
  { value: 'leaders', label: 'Leaders', title: "The momentum model's ranking across the window" },
]

const GRADE_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
]

/** How many rows the list draws before it stops and says so. */
const SHOW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'hot', label: 'Hot', title: `Composite ${HOT_AT} and over` },
  { value: 'cold', label: 'Cold', title: `Composite ${COLD_AT} and under` },
]

type SortKey = 'composite' | RatingLensKey
const RATINGS_VIEW_PARAMS = ['view', 'universe', 'lsort', 'lsym', 'lsess', 'show', 'stage', 'path', 'grade', 'sym'] as const

export default function StockRatingsPage() {
  // The page's view (Rev .79): the weights and sort here, the rest in the URL.
  const [weights, setWeights] = usePageViewState<RatingWeights>('w', SERVER_WEIGHTS)
  const [sort, setSort] = usePageViewState<SortKey>('sort', 'composite')
  usePageViewParams(RATINGS_VIEW_PARAMS)
  // Universe and Show live in the URL: this page is a working set, and a
  // working set you cannot send to someone is half a page.
  const [params, setParams] = useSearchParams()
  // Leaders defaults to the whole market, Today to your book and watchlist:
  // one is a reading of what the momentum model saw anywhere, the other of
  // what you are actually carrying. A deep link into Leaders has to open the
  // same way the toggle does, or `?view=leaders` shows a filtered ranking
  // while the toggle shows the market (found by opening the link).
  const universe = (params.get('universe') ??
    (params.get('view') === 'leaders' ? 'all' : 'both')) as PortfolioUniverse
  // The design's View (Package 2026-09-23.5): Today is the stock model's
  // ranking for one session; Leaders is the momentum model's ranking across
  // the window. Two models, two questions, one page — which is why it is a
  // View and not a second route.
  const view = params.get('view') === 'leaders' ? 'leaders' : 'today'
  const isLeaders = view === 'leaders'
  const leaderSort = (params.get('lsort') ?? 'peak') as LeaderSortKey
  const leaderSel = params.get('lsym')
    ? { symbol: params.get('lsym')!, date: params.get('lsess') ?? '' }
    : null
  const show = params.get('show') ?? 'all'
  // SEPA Daily Core's three filters, which the design moved here with the
  // rest of that page (§15.2). URL state like the two above, so a filtered
  // view is a link.
  const stage = (params.get('stage') ?? 'all') as StageFilter
  const path = (params.get('path') ?? 'all') as PathFilter
  const grade = (params.get('grade') ?? 'all') as GradeFilter
  const setParam = (k: string, v: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (v === fallback) next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const q = useQuery({
    queryKey: ['research', 'sepa', 'model-daily', PAGE_LIMIT],
    queryFn: () => fetchSepaDaily({ limit: PAGE_LIMIT }),
    staleTime: 5 * 60_000,
  })
  const { isHolding, isWatchlist } = usePortfolioSymbols()

  const rows = useMemo(
    () => (q.data?.rows ?? []).map(toRatingRow).filter((r): r is RatingRow => r != null),
    [q.data],
  )

  /**
   * The universe first, then the composite, then Hot/Cold.
   *
   * Order matters for the counts: `hot` and `cold` are read off the universe
   * you chose, not off all five hundred, so the header's numbers are the
   * denominators of the list underneath rather than of a set you are not
   * looking at.
   */
  const inUniverse = useMemo(() => {
    if (universe === 'all') return rows
    return rows.filter((r) => {
      const held = isHolding(r.symbol)
      const watched = isWatchlist(r.symbol)
      if (universe === 'holdings') return held
      if (universe === 'watchlist') return watched
      return held || watched
    })
  }, [rows, universe, isHolding, isWatchlist])

  const withComposite = useMemo(
    () => inUniverse.map((r) => ({ row: r, ...composite(r, weights) })),
    [inUniverse, weights],
  )

  const counts = useMemo(() => {
    let hot = 0
    let cold = 0
    for (const r of withComposite) {
      const f = flagOf(r.score)
      if (f === 'hot') hot += 1
      else if (f === 'cold') cold += 1
    }
    return { hot, cold, total: withComposite.length }
  }, [withComposite])

  // The design's standing figures are taken over the pool, before the filters
  // — a Setup+Pivot count that changed when you pressed Setup+Pivot would be
  // answering a question nobody asked.
  const standing = useMemo(() => ratingsStanding(withComposite), [withComposite])

  const scored = useMemo(
    () =>
      withComposite
        .filter((r) => show === 'all' || flagOf(r.score) === show)
        .filter((r) => matchesStage(r.row.stage, stage))
        .filter((r) => matchesPath(r.row.path, path))
        .filter((r) => matchesGrade(r.row.grade, grade))
        .sort((a, b) => {
          if (sort === 'composite') return (b.score ?? -1) - (a.score ?? -1)
          return (b.row.scores[sort] ?? -1) - (a.row.scores[sort] ?? -1)
        }),
    [withComposite, show, sort, stage, path, grade],
  )

  // The design opens the Why panel on a row click, and keeps it in the URL so
  // a name you are arguing about can be sent to someone.
  const selected = params.get('sym')
  const setSelected = (sym: string | null) => setParam('sym', sym ?? '', '')
  const selectedIndex = scored.findIndex((r) => r.row.symbol === selected)
  const selectedRow = selectedIndex >= 0 ? scored[selectedIndex] : null

  /**
   * What this list is ranking, and why each name is on it.
   *
   * The Symbol page's `From …` strip and its `WHY IT WAS THERE` chips read this
   * — so a name opened from here arrives carrying the equity model's reading of
   * it, not just its ticker. `drove: 'trend'` is why that page says "trend
   * drove the screen" rather than naming a volatility lens: this table sorted
   * on the company, and only the table knows that.
   */
  useEffect(() => {
    if (scored.length === 0) return
    publishSymbolTrail({
      label: 'Stock ratings',
      href: '/research/ratings/stocks',
      note: `${WEIGHT_PRESETS.find((p) => p.id === presetOf(WEIGHT_PRESETS, RATING_LENSES, weights))?.label.toLowerCase() ?? 'custom'} weights`,
      drove: 'trend',
      items: scored.map(({ row, score }) => ({
        symbol: row.symbol,
        why: [row.grade, row.path].filter(Boolean).join(' · ') || undefined,
        chips: [
          {
            k: 'composite',
            v: score == null ? '—' : score.toFixed(1),
            tone: flagOf(score) === 'neutral' ? ('neutral' as const) : flagOf(score),
          },
          ...RATING_LENSES.map((lens) => ({
            k: lens.label,
            v: row.scores[lens.key] == null ? '—' : row.scores[lens.key]!.toFixed(0),
            tone: 'neutral' as const,
          })),
          { k: 'path', v: row.path ?? '—', tone: 'neutral' as const },
        ],
      })),
    })
  }, [scored, weights])

  const tape = ratingsTape(counts.hot, counts.cold, counts.total)
  /* One bar per lens, over the universe rather than the Hot/Cold cut: the
     panel answers "is it breadth", and a spread of the names that already
     passed the filter cannot. */
  const spreads: LensSpread[] = useMemo(
    () =>
      RATING_LENSES.map((lens) => {
        const sp = lensSpread(inUniverse, lens.key)
        return {
          key: lens.key,
          label: lens.label,
          ...sp,
          titles: [
            `${sp.hot} at 70 or above`,
            `${sp.mid} between 40 and 70`,
            `${sp.cold} under 40`,
          ] as [string, string, string],
        }
      }),
    [inUniverse],
  )
  const asOf = q.data?.trade_date ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* The prototype carries `_Part Face` here: this page has a Method face,
          and the switch belongs to the page rather than to the tree. It renders
          disabled while `/research/lab/today` is unbuilt, and lights up by
          itself the day that page lands. */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_28rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research</p>}
            title="Ratings · Stocks"
            titleSize="large"
            description={LEAD}
          />
        </div>
        <PageFaceSwitch path="/research/ratings/stocks" className="ml-auto mt-1 flex-none" />
        {/* The design's two header buttons. Both write: one drafts a
            hypothesis out of this view, the other turns the universe × these
            weights into a scheduled objective. What either should stamp as
            its source is the same open product question as the row verbs, so
            they say what they would do rather than doing a guess. */}
        <span
          className="mt-1 flex flex-none items-center gap-2 text-dense-caption text-muted-foreground/70"
          title="The design offers “Save as hypothesis” and “→ Autopilot objective” here. Both write — into the Book and into the loop's schedule — and what this page stamps as the source of either is a product call. Owed with the row verbs."
        >
          <span className="rounded border border-border px-2 py-1">≋ Save as hypothesis</span>
          <span className="rounded border border-border px-2 py-1">→ Autopilot objective</span>
        </span>
      </div>

      {q.isError ? <QueryErrorAlert error={q.error} /> : null}

      {/* The design's filter bar. Without it this page is five hundred rows
          in one list, which is a database dump with a headline on it. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border px-3 py-2 mat-card">
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>View</span>
          <SegmentControl
            size="xs"
            ariaLabel="View"
            value={view}
            onChange={(v) => {
              // Leaders is a reading of the whole market, so it opens at All
              // — the book filter belongs to today's ranking. Narrowing it
              // again afterwards is the reader's to do.
              const next = new URLSearchParams(params)
              if (v === 'leaders') {
                next.set('view', 'leaders')
                next.set('universe', 'all')
              } else {
                next.delete('view')
                next.delete('universe')
              }
              next.delete('sym')
              next.delete('lsym')
              next.delete('lsess')
              setParams(next, { replace: true })
            }}
            options={VIEW_OPTIONS}
          />
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>Universe</span>
          <SegmentControl
            size="xs"
            ariaLabel="Universe"
            value={universe}
            onChange={(v) => setParam('universe', v, 'both')}
            options={PORTFOLIO_UNIVERSE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>Show</span>
          <SegmentControl
            size="xs"
            ariaLabel="Show"
            value={show}
            onChange={(v) => setParam('show', v, 'all')}
            options={SHOW_OPTIONS}
          />
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        {/* Marked, not dropped: the design's third filter is a saved screen,
            and the Screener's own walk settled that nothing saves one yet. */}
        <span
          className="flex items-center gap-2 text-dense-caption text-muted-foreground"
          title="The design filters this list by a saved screen. Nothing on this side saves a screen yet — the same gap the Stock screen page names."
        >
          <span className={SECTION_CAP_CLASS}>Screen</span>
          <span className="font-mono">— nothing saves a screen yet</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-dense-meta text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">{counts.hot}</span> hot ·{' '}
          <span className="font-mono tabular-nums text-foreground">{counts.cold}</span> cold ·{' '}
          <span className="font-mono tabular-nums">{counts.total}</span> scored
          {asOf ? (
            <>
              {' '}· as of <span className="font-mono tabular-nums text-foreground">{asOf}</span>
            </>
          ) : null}
        </span>
      </div>

{isLeaders ? null : (
      <>
            {/* The design's second filter bar — SEPA Daily Core's three, moved here
          with the rest of that page (design Package 2026-09-23.2, §15.2).
          Hidden on Leaders: these filter today's stock-model reading, and a
          momentum leader need not have a SEPA row at all.

          They filter in the browser, not on the server, even though the
          endpoint takes all three: the composite is computed here from your
          weights, so a server filter would change the pool the average is
          taken over and the same slider would read differently under each
          filter. One fetch, one pool, filters on top. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border px-3 py-2 mat-card">
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>Stage</span>
          <SegmentControl
            size="xs"
            ariaLabel="Stage"
            value={stage}
            onChange={(v) => setParam('stage', v, 'all')}
            options={STAGE_OPTIONS}
          />
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>Path</span>
          <SegmentControl
            size="xs"
            ariaLabel="Path"
            value={path}
            onChange={(v) => setParam('path', v, 'all')}
            options={PATH_OPTIONS}
          />
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="flex items-center gap-2">
          <span className={SECTION_CAP_CLASS}>Grade</span>
          <SegmentControl
            size="xs"
            ariaLabel="Grade"
            value={grade}
            onChange={(v) => setParam('grade', v, 'all')}
            options={GRADE_OPTIONS}
          />
        </span>
        {/* The design puts three figures here. Each says the window it is
            taken over, because this page ranks: the store holds Stage 4,
            Avoid and grade D rows — asked for directly the endpoint returns
            them — and none of them is inside the top {PAGE_LIMIT} by score.
            A bare "0 in stage 4" would read as "none exist". */}
        <span
          className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-dense-meta text-muted-foreground"
          title={`Taken over the ${standing.scored} scored names in this ranking — the top ${PAGE_LIMIT} by SEPA score — not over the whole universe. Stage 4, Avoid and grade D rows exist in the store and do not reach this window.`}
        >
          <span className="font-mono tabular-nums text-foreground">{standing.setupPivot}</span>{' '}
          setup+pivot ·{' '}
          <span className="font-mono tabular-nums text-foreground">{standing.stage4}</span> stage 4
          ·{' '}
          <span className="font-mono tabular-nums text-foreground">{standing.avgComposite}</span>{' '}
          avg · of {standing.scored} ranked
        </span>
      </div>
      </>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-[1_1_20rem] space-y-3">
          {isLeaders ? null : (
          <WeightsPanel
            lenses={RATING_LENSES}
            presets={WEIGHT_PRESETS}
            weights={weights}
            onWeights={(w) => setWeights(w as RatingWeights)}
            serverPresetId="model"
            customNote="Your own weights. A lens a company has no score for is left out of both halves rather than counted as zero, so a thinly-scored name is not pushed down for being thin."
          />
          )}

          {/* Momentum Radar's nine sub-factors, which the design moved here
              (§15.2). The selected row, or the top of the ranking when nothing
              is selected — the design's own default. */}
          <MomentumFactorsPanel
            symbol={
              isLeaders
                ? (leaderSel?.symbol ?? null)
                : (selected ?? scored[0]?.row.symbol ?? null)
            }
            // On Leaders a cell is a session, so the panel reads that one
            // rather than the name's latest — clicking a cell is the whole
            // point of the bar.
            session={isLeaders ? (leaderSel?.date || null) : null}
            isSelection={isLeaders ? !!leaderSel : !!selectedRow}
          />

          {isLeaders ? null : (
          <LensSpreadPanel
            label={tape.label}
            sentence={tape.sentence}
            note={`${counts.total} in view`}
            spreads={spreads}
            caption={
              <>
                Strong / weak per lens, at 70 and under 40. The thresholds are this page’s, not
                the model’s. The design draws a fifth bar for relative strength; this row
                carries no RS field, so there are four.
              </>
            }
          />
          )}
        </div>

        <div className="min-w-0 flex-[999_1_40rem]">
          {isLeaders ? (
            <LeadersFace
              universe={universe}
              inUniverse={(sym) => isHolding(sym) || isWatchlist(sym)}
              sort={leaderSort}
              onSort={(k) => setParam('lsort', k, 'peak')}
              selected={leaderSel}
              onSelect={(sel) => {
                const next = new URLSearchParams(params)
                if (sel) {
                  next.set('lsym', sel.symbol)
                  next.set('lsess', sel.date)
                } else {
                  next.delete('lsym')
                  next.delete('lsess')
                }
                setParams(next, { replace: true })
              }}
              todayOf={(sym) => {
                const hit = withComposite.find((r) => r.row.symbol === sym)
                return hit ? { grade: hit.row.grade, path: hit.row.path } : null
              }}
              onUniverseAll={() => setParam('universe', 'all', 'both')}
            />
          ) : (
          <TodayFace
            scored={scored}
            rows={rows}
            counts={counts}
            q={q}
            universe={universe}
            sort={sort}
            setSort={setSort}
            selected={selected}
            setSelected={setSelected}
            weights={weights}
          />
          )}
        </div>
      </div>

      <RightInspectorShell
        open={selectedRow != null}
        ariaLabel="Why this composite"
        onClose={() => setSelected(null)}
      >
        {selectedRow ? (
          <WhyInspector
            row={selectedRow.row}
            weights={weights}
            score={selectedRow.score}
            serverScore={selectedRow.row.serverScore}
            rank={selectedIndex + 1}
            total={scored.length}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </RightInspectorShell>
    </PageShell>
  )
}
