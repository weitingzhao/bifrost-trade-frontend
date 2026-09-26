/**
 * Today — the stock model's ranking for one session.
 *
 * The other half of the View the design added in Package 2026-09-23.5. It
 * sits beside `LeadersFace` rather than inside the page for the reason the
 * View exists: two models answering two questions, and a page that holds both
 * bodies inline is a page that has to be read twice to find either.
 */
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { LensBarCell } from '@/components/research/LensBarCell'
import { PortfolioTag } from '@/components/portfolio/PortfolioTag'
import { rowSelectProps } from '@/hooks/useRowLink'
import { SectionPanel } from '@/components/layout/SectionPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { cn } from '@/lib/utils'
import { presetOf } from '@/components/research/weightModel'
import {
  GROWTH_CHECKS,
  RATING_LENSES,
  TREND_CHECKS,
  pathVariant,
  WEIGHT_PRESETS,
  type RatingLensKey,
  type RatingRow,
  type RatingWeights,
} from './stockRatingsModel'

/** The design's cap on drawn rows — the list says so when it stops. */
const ROW_CAP = 200


function lensInk(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  if (v >= 70) return 'text-[var(--color-profit)]'
  return v < 40 ? 'text-destructive' : ''
}

/**
 * A lens score, as this page reads it.
 *
 * The drawing is shared (`LensBarCell`); what belongs to this page is what the
 * cell *says*: `out` turns the percentage back into what it counted — trend is
 * eleven checks, growth is eight, and `9/11` says something `81.8` does not —
 * and the title states that the fill is the score on its own scale, because
 * this row carries no year of the lens's own history to band it against.
 */
function LensCell({ v, pass, out }: { v: number | null; pass?: number | null; out?: number }) {
  return (
    <LensBarCell
      label={pass != null && out != null ? `${pass}/${out}` : v == null ? '—' : v.toFixed(0)}
      pos={v}
      ink={lensInk(v)}
      title={
        v == null
          ? 'No score for this lens on this name.'
          : `${v.toFixed(1)} of 100 on this lens. The bar is the score on its own scale — this row carries no history for the lens, so there is no 1-year band behind it.`
      }
    />
  )
}

/** All / Hot / Cold, the design's own third filter. */


export function TodayFace({
  scored,
  rows,
  counts,
  q,
  universe,
  sort,
  setSort,
  selected,
  setSelected,
  weights,
}: {
  scored: { row: RatingRow; score: number | null; missing: number }[]
  /** Every scored name, before the universe filter — for the empty state. */
  rows: RatingRow[]
  counts: { hot: number; cold: number; total: number }
  q: { isLoading: boolean; isError: boolean; error: unknown }
  universe: string
  sort: 'composite' | RatingLensKey
  setSort: (k: 'composite' | RatingLensKey) => void
  selected: string | null
  setSelected: (s: string | null) => void
  weights: RatingWeights
}) {
  return (
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
                      className="w-20 max-w-none text-right"
                      title="Where today's implied vol sits in its own year. Measured on DEV 2026-09-23: /research/sepa/model/daily carries it, and 146 of the 500 ranked names have one — the rest print — because the option side has not reached them, not because the reading is zero."
                    >
                      IV %ile
                    </DenseTableHead>
                    <DenseTableHead
                      className="w-20 max-w-none text-right"
                      title="Put/call ratio on open interest, from the same row. Populated for the same 146 of 500."
                    >
                      PCR OI
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
                        className={cn(
                          denseTableNumCell,
                          'max-w-none',
                          row.ivPercentile == null && 'text-muted-foreground',
                        )}
                      >
                        {row.ivPercentile == null ? '—' : row.ivPercentile.toFixed(0)}
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn(
                          denseTableNumCell,
                          'max-w-none',
                          row.pcrOi == null && 'text-muted-foreground',
                        )}
                      >
                        {row.pcrOi == null ? '—' : row.pcrOi.toFixed(2)}
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
                          {/* Pool was owed on a product question — what this
                              page stamps as the source — and the design
                              answered it: source `scan`, carrying the preset
                              the composite was read at. Pin and Hypothesis
                              stay owed with the six-verb row. */}
                          <AddToPoolButton
                            symbol={row.symbol}
                            source="scan"
                            score={score ?? undefined}
                            tags={['ratings', ...(row.grade ? [row.grade] : [])]}
                            lens_snapshot={{
                              grade: row.grade,
                              path: row.path,
                              stage: row.stage,
                              composite: score,
                              preset: presetOf(WEIGHT_PRESETS, RATING_LENSES, weights),
                            }}
                            size="icon"
                          />
                          <span
                            className="rounded px-1.5 py-0.5 text-dense-meta text-muted-foreground/70"
                            title="The design also puts Pin and Hypothesis here. Each writes somewhere — the sidebar shelf, the Book — and what this page should stamp as the source is still a product call for those two. Owed, with the six-verb row they belong to."
                          >
                            ⊹ ≋
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
              row, so there are four. Observe-only: nothing here sizes or trades.
              {scored.length > ROW_CAP
                ? ` The list stops at ${ROW_CAP} rows; ${scored.length} are in view. Narrow the universe rather than scrolling — that is what the filter bar is for.`
                : ''}
            </p>
          </SectionPanel>
  )
}
