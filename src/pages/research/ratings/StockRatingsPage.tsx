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
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  PageFaceSwitch,
  PageHeader,
  PageShell,
  SectionPanel,
  SECTION_CAP_CLASS,
} from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  usePortfolioSymbols,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { WhyInspector } from './WhyInspector'
import { cn } from '@/lib/utils'
import { fetchSepaDaily } from '@/api/researchEngine'
import { rowSelectProps } from '@/hooks/useRowLink'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import {
  COLD_AT,
  GROWTH_CHECKS,
  HOT_AT,
  RATING_LENSES,
  SERVER_WEIGHTS,
  TREND_CHECKS,
  WEIGHT_PRESETS,
  composite,
  flagOf,
  lensSpread,
  pathVariant,
  presetOf,
  ratingsTape,
  toRatingRow,
  weightSum,
  type RatingLensKey,
  type RatingRow,
  type RatingWeights,
} from './stockRatingsModel'

const LEAD =
  'The equity model’s daily opinion: which companies are in a tradeable trend. Trend template, growth, momentum and structure — one composite, weights yours to move. It says nothing about premium; that is the option side’s question.'

/** The page reads 500, which is the route’s own cap. */
const PAGE_LIMIT = 500

/** How many rows the list draws before it stops and says so. */
const ROW_CAP = 200

type SortKey = 'composite' | RatingLensKey

function lensInk(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  if (v >= 70) return 'text-[var(--color-profit)]'
  return v < 40 ? 'text-destructive' : ''
}

/**
 * A lens score and where it sits on its own scale.
 *
 * The design draws a 6px track with a grey band (the 252-session range) and a
 * thin accent marker at today's value, and colours only the number. This page
 * drew a solid bar filled to the value in green or red instead, which put
 * four columns of saturated colour across every row and left the tags and the
 * grades — the cells that are actually trying to say something — competing
 * with it. The track is neutral here and the marker carries the accent.
 *
 * The band is absent, not forgotten: `high_52w`/`low_52w` are price, and
 * nothing on this row carries a year of the lens's own history, so there is
 * no range to shade. The fill to the value stands in for it — it still ranks
 * rows against each other, which is what the column is for — and the title
 * says what it is not.
 *
 * `out` turns the percentage back into what it counted: trend is eleven
 * checks, growth is eight, and `9/11` says something a `81.8` does not.
 */
function LensCell({ v, pass, out }: { v: number | null; pass?: number | null; out?: number }) {
  const label =
    pass != null && out != null ? `${pass}/${out}` : v == null ? '—' : v.toFixed(0)
  return (
    <span
      className="flex items-center gap-1.5"
      title={
        v == null
          ? 'No score for this lens on this name.'
          : `${v.toFixed(1)} of 100 on this lens. The bar is the score on its own scale — this row carries no history for the lens, so there is no 1-year band behind it.`
      }
    >
      <span className={cn('w-9 shrink-0 text-right font-mono tabular-nums', lensInk(v))}>
        {label}
      </span>
      <span className="relative block h-1.5 w-full min-w-10 rounded-sm bg-secondary">
        {v != null ? (
          <>
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-foreground/20"
              style={{ width: `${Math.max(2, v)}%` }}
            />
            <span
              className="absolute -top-0.5 h-2.5 w-0.5 rounded-sm bg-primary"
              style={{ left: `calc(${Math.min(99, Math.max(0, v))}% - 1px)` }}
            />
          </>
        ) : null}
      </span>
    </span>
  )
}

/** All / Hot / Cold, the design's own third filter. */
const SHOW_OPTIONS = [
  { value: 'all', label: 'All', title: 'Every scored name in this universe' },
  { value: 'hot', label: 'Hot', title: `Composite ${HOT_AT} and over` },
  { value: 'cold', label: 'Cold', title: `Composite ${COLD_AT} and under` },
]

export default function StockRatingsPage() {
  const [weights, setWeights] = useState<RatingWeights>(SERVER_WEIGHTS)
  const [sort, setSort] = useState<SortKey>('composite')
  // Universe and Show live in the URL: this page is a working set, and a
  // working set you cannot send to someone is half a page.
  const [params, setParams] = useSearchParams()
  const universe = (params.get('universe') ?? 'both') as PortfolioUniverse
  const show = params.get('show') ?? 'all'
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

  const scored = useMemo(
    () =>
      withComposite
        .filter((r) => show === 'all' || flagOf(r.score) === show)
        .sort((a, b) => {
          if (sort === 'composite') return (b.score ?? -1) - (a.score ?? -1)
          return (b.row.scores[sort] ?? -1) - (a.row.scores[sort] ?? -1)
        }),
    [withComposite, show, sort],
  )

  // The design opens the Why panel on a row click, and keeps it in the URL so
  // a name you are arguing about can be sent to someone.
  const selected = params.get('sym')
  const setSelected = (sym: string | null) => setParam('sym', sym ?? '', '')
  const selectedIndex = scored.findIndex((r) => r.row.symbol === selected)
  const selectedRow = selectedIndex >= 0 ? scored[selectedIndex] : null

  const tape = ratingsTape(counts.hot, counts.cold, counts.total)
  const preset = presetOf(weights)
  const sum = weightSum(weights)
  const onModel = preset === 'model'
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-background px-3 py-2">
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

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-[1_1_20rem] space-y-3">
          <SectionPanel
            cap="Composite"
            title="Weights"
            note={
              onModel
                ? 'on the server’s own — this list agrees with its score'
                : `moved off the model · Σ ${sum}`
            }
          >
            <div className="px-3 py-2">
              <SegmentControl
                size="xs"
                ariaLabel="Weight preset"
                value={preset ?? 'custom'}
                onChange={(id) => {
                  const p = WEIGHT_PRESETS.find((x) => x.id === id)
                  if (p) setWeights(p.weights)
                }}
                options={[
                  ...WEIGHT_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(preset == null ? [{ value: 'custom', label: 'Custom' }] : []),
                ]}
              />
            </div>
            <div className="flex flex-col gap-2 px-3 pb-2">
              {RATING_LENSES.map((lens) => (
                <label key={lens.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-center gap-2">
                  <span className="text-dense-label">{lens.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={weights[lens.key]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [lens.key]: Number(e.target.value) }))
                    }
                    className="h-3.5 w-full accent-[var(--color-profit)]"
                    aria-label={`${lens.label} weight`}
                  />
                  <span className="text-right font-mono text-dense-label tabular-nums">
                    {weights[lens.key]}
                  </span>
                </label>
              ))}
              <p className="text-dense-caption leading-relaxed text-muted-foreground">
                {WEIGHT_PRESETS.find((p) => p.id === preset)?.note ??
                  'Your own weights. A lens a company has no score for is left out of both halves rather than counted as zero, so a thinly-scored name is not pushed down for being thin.'}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel cap="Tape" title={tape.label} note={`${counts.total} in view`}>
            <p className="px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground">
              {tape.sentence}
            </p>
            {/* Five thin bars in one row, the way the design draws them: this
                panel answers "is it breadth or is it one name", and it should
                not out-shout the list it is a caption for. The earlier version
                was two columns of tall blocks and read as the page's subject. */}
            <div className="grid grid-cols-4 gap-2 px-3 pb-2">
              {RATING_LENSES.map((lens) => {
                const sp = lensSpread(inUniverse, lens.key)
                const total = Math.max(1, sp.scored)
                return (
                  <div key={lens.key} className="min-w-0">
                    <div className={cn(SECTION_CAP_CLASS, 'truncate')}>{lens.label}</div>
                    <div className="mt-1 flex h-2.5 gap-px overflow-hidden rounded-sm">
                      <span
                        className="block bg-[var(--color-profit)]/70"
                        style={{ width: `${(sp.hot / total) * 100}%` }}
                        title={`${sp.hot} at 70 or above`}
                      />
                      <span
                        className="block bg-secondary"
                        style={{ width: `${(sp.mid / total) * 100}%` }}
                        title={`${sp.mid} between 40 and 70`}
                      />
                      <span
                        className="block bg-destructive/70"
                        style={{ width: `${(sp.cold / total) * 100}%` }}
                        title={`${sp.cold} under 40`}
                      />
                    </div>
                    <div className="mt-0.5 font-mono text-dense-caption text-muted-foreground">
                      {sp.hot} / {sp.cold}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              Strong / weak per lens, at 70 and under 40. The thresholds are this page’s, not the
              model’s. The design draws a fifth bar for relative strength; this row carries no RS
              field, so there are four.
            </p>
          </SectionPanel>
        </div>

        <div className="min-w-0 flex-[999_1_40rem]">
          <SectionPanel
            cap="Ranked"
            title={
              scored.length > ROW_CAP
                ? `${ROW_CAP} of ${scored.length} underlyings`
                : `${scored.length} underlying${scored.length === 1 ? '' : 's'}`
            }
            note={
              sort === 'composite'
                ? 'by your composite · click a lens header to rank by it instead'
                : `by ${RATING_LENSES.find((l) => l.key === sort)?.label} · click Comp to go back`
            }
          >
            {q.isLoading ? (
              <Skeleton className="m-3 h-64 rounded-md" />
            ) : scored.length === 0 ? (
              /* The design draws an empty state here, and it has to name which
                 filter emptied the list — otherwise a page with nothing on it
                 is indistinguishable from a page whose data did not load. */
              <p className="px-3 py-6 text-center text-dense-meta text-muted-foreground">
                {counts.total === 0
                  ? universe === 'all'
                    ? 'Nothing is scored today.'
                    : `No name in this universe carries a score today. ${rows.length} are scored across all names.`
                  : `${counts.total} scored in this universe, and the Show filter removed all of them — ${counts.hot} are hot, ${counts.cold} cold, and the rest sit in between.`}
              </p>
            ) : (
              <DenseDataTable
                wrapClassName="rounded-none border-0 overflow-x-auto"
                tableClassName="min-w-[68rem]"
              >
                <DenseTableHeader>
                  <DenseTableHeadRow>
                    <DenseTableHead className="w-20 max-w-none">Symbol</DenseTableHead>
                    <DenseTableHead className="w-16 max-w-none">Book</DenseTableHead>
                    <DenseTableHead
                      className="w-16 max-w-none cursor-pointer text-right"
                      onClick={() => setSort('composite')}
                      title="Rank by your composite"
                    >
                      Comp {sort === 'composite' ? '↓' : ''}
                    </DenseTableHead>
                    {RATING_LENSES.map((lens) => (
                      <DenseTableHead
                        key={lens.key}
                        className="w-28 max-w-none cursor-pointer"
                        onClick={() => setSort(lens.key)}
                        title={`Rank by ${lens.label}`}
                      >
                        {lens.label} {sort === lens.key ? '↓' : ''}
                      </DenseTableHead>
                    ))}
                    <DenseTableHead className="w-28 max-w-none">Grade · path</DenseTableHead>
                    <DenseTableHead className="w-16 max-w-none text-right">52w</DenseTableHead>
                    <DenseTableHead
                      className="w-14 max-w-none text-right"
                      title="Days to the next print. No future earnings date reaches this side: /research/events/calendar, /research/events and /research/event-radar/events all answer with count 0, and the vendor gap behind them is a subscription one. The column stays so the absence is visible where the design put the number."
                    >
                      Earn
                    </DenseTableHead>
                    <DenseTableHead
                      className="w-32 max-w-none"
                      title="Which playbook rule fits this name. /research/playbook/rules answers, and holds nothing today — but the shape is the harder half: a rule carries a title, a category and prose, with no symbol and no predicate, so nothing can decide which rule a row matches. The column stays and says so."
                    >
                      Rule
                    </DenseTableHead>
                    <DenseTableHead className="w-24 max-w-none">Capture</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {scored.slice(0, ROW_CAP).map(({ row, score, missing }) => (
                    <DenseTableRow
                      key={row.symbol}
                      {...rowSelectProps(
                        selected === row.symbol,
                        () => setSelected(selected === row.symbol ? null : row.symbol),
                        cn(selected === row.symbol && 'bg-primary/[0.06]'),
                      )}
                    >
                      <DenseTableCell className="max-w-none whitespace-nowrap">
                        <Link
                          to={withSymbolParam(SYMBOL_PATH, row.symbol)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-entity-symbol hover:underline"
                          title={`Open ${row.symbol} on Symbol`}
                        >
                          {row.symbol}
                        </Link>
                      </DenseTableCell>
                      <DenseTableCell className="max-w-none">
                        <PortfolioTag symbol={row.symbol} variant="inline" />
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, 'max-w-none font-semibold')}
                        title={
                          missing > 0
                            ? `${missing} of the lenses you weighted has no score for this name — left out of the average rather than counted as zero.`
                            : row.serverScore != null
                              ? `The server scored this ${row.serverScore.toFixed(1)} at its own weights.`
                              : undefined
                        }
                      >
                        {score == null ? '—' : score.toFixed(1)}
                        {missing > 0 ? <span className="text-muted-foreground">*</span> : null}
                      </DenseTableCell>
                      {RATING_LENSES.map((lens) => (
                        <DenseTableCell key={lens.key} className="max-w-none">
                          <LensCell
                            v={row.scores[lens.key]}
                            pass={
                              lens.key === 'trend'
                                ? row.passes.trend
                                : lens.key === 'growth'
                                  ? row.passes.growth
                                  : null
                            }
                            out={
                              lens.key === 'trend'
                                ? TREND_CHECKS
                                : lens.key === 'growth'
                                  ? GROWTH_CHECKS
                                  : undefined
                            }
                          />
                        </DenseTableCell>
                      ))}
                      <DenseTableCell className="max-w-none whitespace-nowrap">
                        {/* Coloured by path, which is what the model says to do
                            about the name — not by grade, which made every A
                            green and said nothing about whether it is actionable. */}
                        <DenseTag variant={pathVariant(row.path)} size="cell">
                          {[row.grade, row.path].filter(Boolean).join(' · ') || '—'}
                        </DenseTag>
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'max-w-none')}>
                        {row.rangePos == null ? '—' : `${Math.round(row.rangePos * 100)}%`}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}
                        title="No earnings date on this side — see the column header."
                      >
                        —
                      </DenseTableCell>
                      <DenseTableCell
                        className="max-w-none whitespace-nowrap text-dense-meta text-muted-foreground"
                        title="No rule can be matched to a name — see the column header."
                      >
                        no rule binding
                      </DenseTableCell>
                      <DenseTableCell className="max-w-none">
                        <span className="flex items-center gap-1">
                          <Link
                            to={`/trade/plans?symbol=${encodeURIComponent(row.symbol)}&new=1`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded px-1.5 py-0.5 text-dense-meta text-primary hover:bg-secondary"
                            title={`Plan a trade on ${row.symbol} — opens the Plans desk with the form on this name`}
                          >
                            Plan
                          </Link>
                          <span
                            className="rounded px-1.5 py-0.5 text-dense-meta text-muted-foreground/70"
                            title="The design also puts Pin, Pool and Hypothesis here. Each writes somewhere — the sidebar shelf, the Candidate Pool, the Book — and what this page should stamp as the source is a product call, not a layout one. Owed, with the six-verb row it belongs to."
                          >
                            ⊹ ◫ ≋
                          </span>
                        </span>
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseDataTable>
            )}
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              Trend and Growth are counts of checks passed — eleven for the trend template,
              eight for the fundamental screen — because that is what the two scores are:{' '}
              <span className="font-mono">trend_template_score</span> takes only the eleven values{' '}
              <span className="font-mono">n/11 × 100</span>, and 231 of the 500 names score exactly
              100, so a column of percentages was a column of hundreds. Momentum and Structure have
              no such checklist and stay on their own 0–100 scale. The bar is the score on that
              scale, not against a year of the lens’s own history — this row carries none.{' '}
              <span className="font-mono">52w</span> is where the close sits between its own
              52-week low and high, which is the one range it does carry. A{' '}
              <span className="font-mono">*</span> marks a composite scored on fewer than four
              lenses. The design draws a fifth lens, relative strength; no RS field reaches this
              row, so there are four. Observe-only: nothing here sizes or trades (D10).
              {scored.length > ROW_CAP
                ? ` The list stops at ${ROW_CAP} rows; ${scored.length} are in view. Narrow the universe rather than scrolling — that is what the filter bar is for.`
                : ''}
            </p>
          </SectionPanel>
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
