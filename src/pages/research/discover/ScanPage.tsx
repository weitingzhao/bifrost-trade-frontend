/**
 * Ratings · Underlyings — `/research/scan`, the page the menu calls **Vol ratings**.
 *
 * Walked against `Research Scan.dc.html` (Rev 2026-09-20.10) on 2026-09-21.
 * The design's sentence is the page: *"The vol model's daily opinion: which
 * underlyings are worth selling premium on. Five lenses, one composite; the
 * weights are the model and they are yours to move."* What stood here read the
 * weights out as a sentence — `iv:25 vrp:25 slope:15 …` — under a row of chip
 * filters, which is the model described rather than the model handed over.
 *
 * It is the option side of `/research/ratings/stocks`, and it is deliberately
 * the same page twice: the same weights panel, the same tape, the same lens
 * bars, the same Why inspector on a row click. Two ranked lists one click
 * apart that ranked differently would teach the reader nothing they could
 * carry from one to the other, so the three shared pieces live in
 * `components/research/` and each page brings only its own five lenses.
 *
 * **The h1 stays "Vol ratings".** The prototype's own header reads "Ratings ·
 * Underlyings", but the design's registry renamed this leaf when it flattened
 * the two false Discover folds (HANDOFF §"起因与裁定"): four leaves, machine
 * short names, ≤13 characters. §5a.5 ties the h1 to the route label and the
 * last crumb, and the label is the newer decision.
 *
 * What the composite is and why it is computed on this side: `volRatingsModel.ts`.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
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
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import {
  AddToPoolButton,
  presetOf,
  LensBarCell,
  LensSpreadPanel,
  PlanThisButton,
  SaveAsHypothesisButton,
  WeightsPanel,
  type LensSpread,
} from '@/components/research'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import { IconActionButton } from '@/components/data-display'
import { Pin } from 'lucide-react'
import {
  PORTFOLIO_UNIVERSE_OPTIONS,
  type PortfolioUniverse,
} from '@/hooks/usePortfolioSymbols'
import { rowSelectProps } from '@/hooks/useRowLink'
import { publishSymbolTrail } from '@/lib/symbolTrail'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import { VolWhyInspector } from './scan/VolWhyInspector'
import { useVolRatings } from './scan/useVolRatings'
import {
  ADAPTIVE_NOTE,
  COLD_AT,
  HOT_AT,
  SERVER_PRESETS,
  SERVER_WEIGHTS,
  VOL_LENSES,
  composite,
  flagOf,
  lensReading,
  lensSpread,
  regimeVariant,
  volTape,
  type VolLensKey,
  type VolRow,
  type VolRule,
  type VolWeights,
} from './scan/volRatingsModel'

const LEAD =
  'The vol model’s daily opinion: which underlyings are worth selling premium on. Five lenses, one composite; the weights are the model and they are yours to move. It says nothing about the company — that is the equity side’s question.'

/** How many rows the list draws before it stops and says so. */
const ROW_CAP = 200

/** All / Hot / Cold, the design's own third filter — on the composite. */
const SHOW_OPTIONS = [
  { value: 'all', label: 'All', title: 'Every scored name in this universe' },
  { value: 'hot', label: 'Hot', title: `Composite ${HOT_AT} and over — premium is rich` },
  { value: 'cold', label: 'Cold', title: `Composite ${COLD_AT} and under — premium is cheap` },
]

/** The four lenses the table gives a bar. Terrain wears its regime tag instead. */
const BAR_LENSES = VOL_LENSES.filter((l) => l.key !== 'terrain')

function lensInk(flag: string | undefined): string {
  if (flag === 'hot') return 'text-[var(--color-profit)]'
  if (flag === 'cold') return 'text-destructive'
  return ''
}

export default function ScanPage() {
  const [weights, setWeights] = useState<VolWeights>(SERVER_WEIGHTS)
  const [sort, setSort] = useState<'composite' | VolLensKey>('composite')
  // Universe, Show and the selected name live in the URL: a working set you
  // cannot send to someone is half a page.
  const [params, setParams] = useSearchParams()
  const universe = (params.get('universe') ?? 'both') as PortfolioUniverse
  const show = params.get('show') ?? 'all'
  const setParam = (k: string, v: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (v === fallback) next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const {
    rows,
    asOf,
    universeSize,
    capped,
    adaptiveWeights,
    rules,
    isLoading,
    isError,
    error,
  } = useVolRatings(universe)

  // The server fits `adaptive_30d` from 30 days of hit rates, so the preset
  // only exists once it has answered.
  const presets = useMemo(
    () =>
      adaptiveWeights
        ? [
            ...SERVER_PRESETS,
            { id: 'adaptive_30d', label: 'Adapt', note: ADAPTIVE_NOTE, weights: adaptiveWeights },
          ]
        : SERVER_PRESETS,
    [adaptiveWeights],
  )

  const withComposite = useMemo(
    () => rows.map((r) => ({ row: r, ...composite(r, weights) })),
    [rows, weights],
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

  const selected = params.get('sym')
  const selectedIndex = scored.findIndex((r) => r.row.symbol === selected)
  const selectedRow = selectedIndex >= 0 ? scored[selectedIndex] : null

  /**
   * `j` `k` `esc` — the design's own walk. A list you can step without
   * returning your hand to the mouse is the difference between reading five
   * names and reading fifty.
   *
   * It stands down while a slider or a field has focus, so `j` on a weight is
   * still a keystroke in that control rather than a jump down the list.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return
      if (e.key === 'Escape') {
        setParam('sym', '', '')
        return
      }
      if ((e.key !== 'j' && e.key !== 'k') || scored.length === 0) return
      const at = scored.findIndex((r) => r.row.symbol === params.get('sym'))
      if (at < 0) return
      const step = e.key === 'j' ? 1 : -1
      const next = scored[(at + step + scored.length) % scored.length]
      // Taken: the Symbol list's own j / k stands down (it checks this).
      e.preventDefault()
      setParam('sym', next.row.symbol, '')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /**
   * What this list is ranking, in the order it is ranking it — and why.
   *
   * The Symbol page reads this to say `From Vol ratings · neutral weights · 3
   * of 19` and to draw the design's `WHY IT WAS THERE` chips. The chips are
   * this page's own numbers, formatted here: the reading that earned a name its
   * place has to be checkable against the page that ranked it, and a second
   * formatting of the same figure is how the two drift apart.
   */
  useEffect(() => {
    if (scored.length === 0) return
    const preset = presetOf(presets, VOL_LENSES, weights)
    publishSymbolTrail({
      label: 'Vol ratings',
      href: '/research/scan',
      note: `${presets.find((p) => p.id === preset)?.label.toLowerCase() ?? 'custom'} weights`,
      // A ranked table is an opinion about one thing, and this one ranks on how
      // volatility is priced. The Symbol page says so rather than guessing.
      drove: 'volatility',
      items: scored.map(({ row, score }) => {
        const called = Object.entries(row.flags)
          .filter(([, v]) => v === 'hot' || v === 'cold')
          .map(([lens, v]) => `${lens} ${v}`)
        return {
          symbol: row.symbol,
          why: called.length > 0 ? called.join(' · ') : undefined,
          chips: [
            {
              k: 'composite',
              v: score == null ? '—' : score.toFixed(1),
              tone: flagOf(score) === 'neutral' ? ('neutral' as const) : flagOf(score),
            },
            ...BAR_LENSES.map((lens) => ({
              k: lens.label,
              v: lensReading(row, lens.key),
              tone: (row.flags[lens.key] ?? 'neutral') as 'hot' | 'cold' | 'neutral',
            })),
            { k: 'terrain', v: row.regime ?? '—', tone: 'neutral' as const },
          ],
        }
      }),
    })
  }, [scored, presets, weights])

  const tape = volTape(counts.hot, counts.cold, counts.total)
  const spreads: LensSpread[] = useMemo(
    () =>
      VOL_LENSES.map((lens) => {
        const sp = lensSpread(rows, lens.key)
        return {
          key: lens.key,
          label: lens.label,
          ...sp,
          titles: [
            `${sp.hot} called hot by the engine`,
            `${sp.mid} called neutral`,
            `${sp.cold} called cold`,
          ] as [string, string, string],
        }
      }),
    [rows],
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_28rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research</p>}
            title="Vol ratings"
            titleSize="large"
            description={LEAD}
          />
        </div>
        <div className="ml-auto mt-1 flex flex-none flex-wrap items-center gap-2">
          <AskCopilotButton
            originPage="analyze-scan"
            originLabel="Vol ratings"
            snapshot={compactSnapshot({
              as_of: asOf,
              hot: counts.hot,
              cold: counts.cold,
              total: counts.total,
              weights,
              top: scored.slice(0, 8).map(({ row, score }) => ({
                symbol: row.symbol,
                composite: score,
                flags: row.flags,
              })),
            })}
            suggestedPrompt={`Summarize today's vol ratings: ${counts.hot} rich / ${counts.cold} cheap of ${counts.total} at my weights. Which underlyings deserve follow-up?`}
          />
          <SaveAsHypothesisButton
            originPage="analyze-scan"
            defaultTitle={`Vol ratings ${asOf ?? 'today'} — ${counts.hot} rich`}
            defaultThesis={tape.sentence}
            defaultSymbols={scored.slice(0, 12).map((r) => r.row.symbol)}
            defaultTags={['scan', 'vol-ratings']}
            originRef={{ source: 'vol-ratings', as_of: asOf, weights }}
          />
          {/* Marked, not drawn: the design's second header button turns this
              universe × these weights into a scheduled objective. It writes
              into the loop's schedule, and what a page stamps as the source of
              a standing objective is a product call — owed with the same
              question the Stocks page carries. */}
          <span
            className="rounded border border-border px-2 py-1 text-dense-caption text-muted-foreground/70"
            title="The design offers “→ Autopilot objective” here: this universe × these weights, composite ≥ 70, daily, into a candidate batch. It writes a standing schedule, and what this page stamps as its source is not a layout question. Owed."
          >
            → Autopilot objective
          </span>
        </div>
      </div>

      {isError ? <QueryErrorAlert error={error} /> : null}

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
        {/* Marked, not dropped: the design narrows the universe by a saved
            Screener set first, and nothing on this side saves a screen yet —
            the same gap the Stock screen page names. */}
        <span
          className="flex items-center gap-2 text-dense-caption text-muted-foreground"
          title="The design feeds this page a saved Screener set to narrow the universe first. Nothing on this side saves a screen yet."
        >
          <span className={SECTION_CAP_CLASS}>Screen</span>
          <span className="font-mono">— nothing saves a screen yet</span>
        </span>
        <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-dense-meta text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">{counts.hot}</span> rich ·{' '}
          <span className="font-mono tabular-nums text-foreground">{counts.cold}</span> cheap ·{' '}
          <span className="font-mono tabular-nums">{counts.total}</span> scored
          {capped && universeSize > counts.total ? (
            <span title={`The route answers with at most 500 rows of ${universeSize} in the scan's universe.`}>
              {' '}of <span className="font-mono tabular-nums">{universeSize}</span>
            </span>
          ) : null}
          {asOf ? (
            <>
              {' '}· as of <span className="font-mono tabular-nums text-foreground">{asOf}</span>
            </>
          ) : null}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-[1_1_20rem] space-y-3">
          <WeightsPanel
            lenses={VOL_LENSES}
            presets={presets}
            weights={weights}
            onWeights={setWeights}
            serverPresetId="neutral"
            customNote="Your own weights. A lens a name carries no reading for is left out of both halves rather than counted as zero, so a thinly-covered name is not pushed down for being thin."
          />

          <LensSpreadPanel
            label={tape.label}
            sentence={tape.sentence}
            note={`${counts.total} in view`}
            spreads={spreads}
            caption={
              <>
                Hot / cold per lens, as the <span className="font-mono">engine</span> called them —
                these are its own <span className="font-mono">lens_flags</span>, not a threshold
                this page invented, which is why the strips can disagree with the Hot / Cold filter
                above (that one cuts the composite at {HOT_AT} and {COLD_AT}). A lens it did not
                call on a name is counted neither way.
              </>
            }
          />
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
                ? 'by your composite · click a lens header to rank by it · click a row for why · j k walk'
                : `by ${VOL_LENSES.find((l) => l.key === sort)?.label} · click Comp to go back`
            }
          >
            {isLoading ? (
              <Skeleton className="m-3 h-64 rounded-md" />
            ) : scored.length === 0 ? (
              <p className="px-3 py-6 text-center text-dense-meta text-muted-foreground">
                {counts.total === 0
                  ? universe === 'all'
                    ? 'Nothing is scored today.'
                    : 'No name in this universe carries a composite today.'
                  : `${counts.total} scored in this universe, and the Show filter removed all of them — ${counts.hot} are rich, ${counts.cold} cheap, and the rest sit in between.`}
              </p>
            ) : (
              <DenseDataTable
                wrapClassName="rounded-none border-0 overflow-x-auto"
                tableClassName="min-w-[72rem]"
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
                    {BAR_LENSES.map((lens) => (
                      <DenseTableHead
                        key={lens.key}
                        className="w-28 max-w-none cursor-pointer"
                        onClick={() => setSort(lens.key)}
                        title={`Rank by ${lens.label}`}
                      >
                        {lens.label} {sort === lens.key ? '↓' : ''}
                      </DenseTableHead>
                    ))}
                    <DenseTableHead className="w-24 max-w-none">Regime</DenseTableHead>
                    <DenseTableHead
                      className="w-14 max-w-none text-right"
                      title="Days to the next print. No forward earnings date reaches this side — /research/events/calendar answers count 0, and the gap behind it is a vendor subscription. The column stays so the absence is visible where the design put the number."
                    >
                      Earn
                    </DenseTableHead>
                    <DenseTableHead
                      className="w-36 max-w-none"
                      title="Which active opportunity is registered on this name, from strategy_opportunity's own symbol list. What it does not say is that the opportunity's entry conditions are met — nothing evaluates those per name, and the design's earnings veto has no date to read."
                    >
                      Rule
                    </DenseTableHead>
                    <DenseTableHead className="w-28 max-w-none">Capture</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {scored.slice(0, ROW_CAP).map(({ row, score, missing }) => (
                    <DenseTableRow
                      key={row.symbol}
                      {...rowSelectProps(
                        selected === row.symbol,
                        () => setParam('sym', selected === row.symbol ? '' : row.symbol, ''),
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
                            ? `${missing} of the lenses you weighted has no reading for this name — left out of the average rather than counted as zero.`
                            : row.serverScore != null
                              ? `The server scored this ${row.serverScore.toFixed(1)} at its own weights.`
                              : undefined
                        }
                      >
                        {score == null ? '—' : score.toFixed(1)}
                        {missing > 0 ? <span className="text-muted-foreground">*</span> : null}
                      </DenseTableCell>
                      {BAR_LENSES.map((lens) => (
                        <DenseTableCell key={lens.key} className="max-w-none">
                          <LensBarCell
                            label={lensReading(row, lens.key)}
                            pos={row.scores[lens.key]}
                            ink={lensInk(row.flags[lens.key])}
                            title={
                              row.scores[lens.key] == null
                                ? 'No reading for this lens on this name.'
                                : `Scores ${row.scores[lens.key]!.toFixed(1)} of 100 on this lens${
                                    row.flags[lens.key]
                                      ? `; the engine calls it ${row.flags[lens.key]}`
                                      : ''
                                  }. The bar is that score on its own scale — this row carries no history for the lens, so there is no 1-year band behind it.`
                            }
                          />
                        </DenseTableCell>
                      ))}
                      <DenseTableCell className="max-w-none whitespace-nowrap">
                        {row.regime ? (
                          <DenseTag variant={regimeVariant(row.regime)} size="cell">
                            {row.regime}
                          </DenseTag>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}
                        title="No earnings date on this side — see the column header."
                      >
                        —
                      </DenseTableCell>
                      <DenseTableCell className="max-w-none whitespace-nowrap text-dense-meta">
                        <RuleCell rules={rules.get(row.symbol)} />
                      </DenseTableCell>
                      <DenseTableCell className="max-w-none">
                        <CaptureCell row={row} score={score} />
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseDataTable>
            )}
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              Each lens prints its reading in its own units and the bar puts it on the 0–100 scale
              the composite uses: IV rank and VRP are already percentiles of their own year, the
              slope and the pin distance are normalised by the engine’s own line (±0.25 saturates),
              and Terrain scores on the terrain model rather than on the regime word beside it. The
              bar is not the design’s 252-session band — the row carries today’s reading and none of
              the lens’s history. A <span className="font-mono">*</span> marks a composite scored on
              fewer than five lenses. Colour is the engine’s hot / cold call, not this page’s.
              Observe-only: nothing here sizes or trades (D10).
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
        onClose={() => setParam('sym', '', '')}
      >
        {selectedRow ? (
          <VolWhyInspector
            row={selectedRow.row}
            weights={weights}
            score={selectedRow.score}
            rank={selectedIndex + 1}
            total={scored.length}
            onClose={() => setParam('sym', '', '')}
          />
        ) : null}
      </RightInspectorShell>
    </PageShell>
  )
}

/**
 * The Rule cell.
 *
 * One active opportunity is named; more than one says how many, because the
 * column is 36 characters wide and a name that fits three rules is a name to
 * open rather than to read in a cell.
 */
function RuleCell({ rules }: { rules: VolRule[] | undefined }) {
  if (!rules || rules.length === 0) {
    return (
      <span
        className="text-muted-foreground"
        title="No active opportunity is registered on this name."
      >
        none active
      </span>
    )
  }
  return (
    <Link
      to={`/trade/rules?pick=opportunity:${rules[0].id}`}
      onClick={(e) => e.stopPropagation()}
      className="truncate hover:underline"
      title={`${rules.map((r) => r.name).join(' · ')} — opens its chain on Rules`}
    >
      {rules[0].name}
      {rules.length > 1 ? (
        <span className="text-muted-foreground"> +{rules.length - 1}</span>
      ) : null}
    </Link>
  )
}

/**
 * The capture ladder, in ascending order of commitment: pin · pool · hypothesis
 * · plan.
 *
 * All four write, and all four already had somewhere to write to — which is
 * why this column is drawn here and marked owed on the Stocks page. A pin from
 * this page is an `iv` hit stamped `/research/scan`, the same shape and the
 * same origin the Pipeline census stamps, so a name captured here and the same
 * name captured from a discovery lane land as one row rather than two.
 */
function CaptureCell({ row, score }: { row: VolRow; score: number | null }) {
  const rich = score != null && score >= HOT_AT
  return (
    <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()} role="none">
      <IconActionButton
        title="Pin to Cockpit"
        ariaLabel={`Pin ${row.symbol}`}
        onClick={() =>
          cockpitPinStore.getState().pinHit({
            kind: 'iv',
            symbol: row.symbol,
            ts: row.tradeDate,
            detail: {
              composite: score,
              iv_rank_1y: row.raw.ivRank,
              vrp_pct_252d: row.raw.vrp,
              terrain_regime: row.regime,
            },
            originPage: '/research/scan',
          })
        }
      >
        <Pin className="h-3.5 w-3.5" />
      </IconActionButton>
      <AddToPoolButton
        symbol={row.symbol}
        source="scan"
        score={score}
        tags={['scan', 'vol-ratings', rich ? 'rich' : 'not-rich']}
        lens_snapshot={{
          composite_score: score,
          iv_rank_1y: row.raw.ivRank,
          vrp_pct_252d: row.raw.vrp,
          atm_slope_30d: row.raw.slope,
          pin_pct_distance: row.raw.pinPct,
          terrain_regime: row.regime,
          lens_flags: row.flags,
        }}
        source_ref={{ trade_date: row.tradeDate }}
      />
      <SaveAsHypothesisButton
        originPage="analyze-scan"
        defaultTitle={`${row.symbol} — vol composite ${score == null ? '—' : score.toFixed(0)}`}
        defaultThesis={`${row.symbol} scores ${score == null ? '—' : score.toFixed(1)} on the vol composite at these weights, in a ${row.regime ?? 'unread'} terrain.`}
        defaultSymbols={[row.symbol]}
        defaultTags={['scan', 'vol-ratings']}
        originRef={{
          source: 'vol-ratings',
          symbol: row.symbol,
          trade_date: row.tradeDate,
          composite: score,
        }}
      />
      <PlanThisButton
        symbol={row.symbol}
        source="vol-ratings"
        sourceLabel="Vol ratings"
        note={`Vol composite ${score == null ? '—' : score.toFixed(1)} · terrain ${row.regime ?? '—'}`}
      />
    </span>
  )
}
