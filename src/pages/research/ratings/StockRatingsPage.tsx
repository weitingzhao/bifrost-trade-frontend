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
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, PageShell, SectionPanel, SECTION_CAP_CLASS } from '@/components/layout'
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
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { fetchSepaDaily } from '@/api/researchEngine'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import {
  RATING_LENSES,
  SERVER_WEIGHTS,
  WEIGHT_PRESETS,
  composite,
  lensSpread,
  presetOf,
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

type SortKey = 'composite' | RatingLensKey

function lensInk(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  if (v >= 70) return 'text-[var(--color-profit)]'
  return v < 40 ? 'text-destructive' : ''
}

/** A lens score and where it sits on its own 0–100 scale. */
function LensCell({ v }: { v: number | null }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('w-8 shrink-0 text-right font-mono tabular-nums', lensInk(v))}>
        {v == null ? '—' : v.toFixed(0)}
      </span>
      <span className="relative block h-1.5 w-full min-w-10 rounded-sm bg-muted">
        {v != null ? (
          <span
            className={cn(
              'absolute inset-y-0 left-0 rounded-sm',
              v >= 70 ? 'bg-[var(--color-profit)]/70' : v < 40 ? 'bg-destructive/70' : 'bg-foreground/40',
            )}
            style={{ width: `${Math.max(2, v)}%` }}
          />
        ) : null}
      </span>
    </span>
  )
}

export default function StockRatingsPage() {
  const [weights, setWeights] = useState<RatingWeights>(SERVER_WEIGHTS)
  const [sort, setSort] = useState<SortKey>('composite')

  const q = useQuery({
    queryKey: ['research', 'sepa', 'model-daily', PAGE_LIMIT],
    queryFn: () => fetchSepaDaily({ limit: PAGE_LIMIT }),
    staleTime: 5 * 60_000,
  })

  const rows = useMemo(
    () => (q.data?.rows ?? []).map(toRatingRow).filter((r): r is RatingRow => r != null),
    [q.data],
  )

  const scored = useMemo(
    () =>
      rows
        .map((r) => ({ row: r, ...composite(r, weights) }))
        .sort((a, b) => {
          if (sort === 'composite') return (b.score ?? -1) - (a.score ?? -1)
          return (b.row.scores[sort] ?? -1) - (a.row.scores[sort] ?? -1)
        }),
    [rows, weights, sort],
  )

  const preset = presetOf(weights)
  const sum = weightSum(weights)
  const onModel = preset === 'model'

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="max-w-[84ch]">
        <PageHeader
          breadcrumb={<p className="text-xs font-medium text-primary/90">Research</p>}
          title="Ratings · Stocks"
          titleSize="large"
          description={LEAD}
        />
      </div>

      {q.isError ? <QueryErrorAlert error={q.error} /> : null}

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

          <SectionPanel cap="Tape" title="How each lens is spread" note={`${rows.length} scored`}>
            <div className="grid grid-cols-2 gap-3 px-3 py-2">
              {RATING_LENSES.map((lens) => {
                const s = lensSpread(rows, lens.key)
                const total = Math.max(1, s.scored)
                return (
                  <div key={lens.key} className="min-w-0">
                    <div className={SECTION_CAP_CLASS}>{lens.label}</div>
                    <div className="mt-1 flex h-4 gap-px overflow-hidden rounded-sm">
                      <span
                        className="block bg-[var(--color-profit)]/80"
                        style={{ width: `${(s.hot / total) * 100}%` }}
                        title={`${s.hot} at 70 or above`}
                      />
                      <span
                        className="block bg-muted"
                        style={{ width: `${(s.mid / total) * 100}%` }}
                        title={`${s.mid} between 40 and 70`}
                      />
                      <span
                        className="block bg-destructive/80"
                        style={{ width: `${(s.cold / total) * 100}%` }}
                        title={`${s.cold} under 40`}
                      />
                    </div>
                    <div className="mt-0.5 font-mono text-dense-caption text-muted-foreground">
                      {s.hot} strong · {s.cold} weak
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              Strong is 70 and over, weak is under 40, and the middle is where most names sit and
              nothing is being said. The thresholds are this page’s, not the model’s.
            </p>
          </SectionPanel>
        </div>

        <div className="min-w-0 flex-[999_1_40rem]">
          <SectionPanel
            cap="Ranked"
            title={`${scored.length} underlyings`}
            note={
              sort === 'composite'
                ? 'by your composite · click a lens header to rank by it instead'
                : `by ${RATING_LENSES.find((l) => l.key === sort)?.label} · click Comp to go back`
            }
          >
            {q.isLoading ? (
              <Skeleton className="m-3 h-64 rounded-md" />
            ) : (
              <DenseDataTable wrapClassName="rounded-none border-0" tableClassName="min-w-[56rem]">
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
                    <DenseTableHead className="w-20 max-w-none text-right">52w</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {scored.slice(0, 200).map(({ row, score, missing }) => (
                    <DenseTableRow key={row.symbol}>
                      <DenseTableCell className="max-w-none whitespace-nowrap">
                        <Link
                          to={withSymbolParam(SYMBOL_PATH, row.symbol)}
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
                          <LensCell v={row.scores[lens.key]} />
                        </DenseTableCell>
                      ))}
                      <DenseTableCell className="max-w-none whitespace-nowrap">
                        {row.grade ? (
                          <DenseTag
                            variant={row.grade.startsWith('A') ? 'success' : row.grade === 'B' ? 'info' : 'neutral'}
                            size="cell"
                          >
                            {row.grade}
                          </DenseTag>
                        ) : null}
                        <span className="ml-1.5 text-dense-meta text-muted-foreground">
                          {row.path ?? '—'}
                        </span>
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'max-w-none')}>
                        {row.rangePos == null ? '—' : `${Math.round(row.rangePos * 100)}%`}
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseDataTable>
            )}
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              The four lenses are the ones the model combines, each on its own 0–100 scale — not
              against a year of its own history, which this row does not carry. <span className="font-mono">52w</span> is
              where the close sits between its own 52-week low and high, which is the one range it
              does. A <span className="font-mono">*</span> marks a composite scored on fewer than
              four lenses. Three columns the design draws are absent rather than empty: a
              relative-strength lens (no RS field on this row), <span className="font-mono">Earn</span> (no
              future earnings date reaches this side) and <span className="font-mono">Rule</span> (nothing
              evaluates Trade › Rules per name). Observe-only: nothing here sizes or trades (D10).
              {scored.length > 200 ? ` Showing the top 200 of ${scored.length}.` : ''}
            </p>
          </SectionPanel>
        </div>
      </div>
    </PageShell>
  )
}
