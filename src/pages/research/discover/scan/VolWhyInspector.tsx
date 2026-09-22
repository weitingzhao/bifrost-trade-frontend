/**
 * Why this name scores what it scores — the design's row inspector.
 *
 * `Research Scan.dc.html` opens it on a row click with the header *"Why ·
 * composite 74"*, one bar per lens, `Points = lens score × weight`, and two
 * ways out into the Labs. The prototype's own footer says where those links
 * came from: *"Labs links moved into the Why panel"* — the table used to carry
 * five of them per row, which put twenty-five links on a twenty-row list.
 *
 * Two things the design writes here are measured, not invented:
 *
 * - the **similar-regime** paragraph is a real reading. `/research/similar-regime`
 *   answers for the lens that is furthest from its middle, and the card that
 *   draws it already existed; the prototype's *"30-day forward IV fell 71% of
 *   the time"* is that endpoint's own sentence.
 * - the points **sum to the composite**, so the panel is a proof rather than a
 *   restatement, and the number in the header is the same one the Comp column
 *   ranks by.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SECTION_CAP_CLASS } from '@/components/layout'
import { SimilarRegimeCard } from '@/components/research'
import { SYMBOL_PATH, labHref, type LabViewId } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import type { SimilarRegimeLens } from '@/api/research/similarRegime'
import { compositeParts, regimeVariant, type VolRow, type VolWeights } from './volRatingsModel'

/**
 * The lens the similar-regime lookup is asked about.
 *
 * The one furthest from its own middle, which is the one saying something —
 * the same rule the page's own hot/cold reading uses. Terrain is asked by its
 * regime word rather than by a score.
 */
const REGIME_LENS: Partial<Record<string, SimilarRegimeLens>> = {
  iv_rank: 'iv_rank',
  vrp: 'vrp',
  atm_slope: 'term_slope',
  pin: 'pin_distance',
  terrain: 'regime',
}

/** Where each lens is read in full. Two per the design's own two buttons. */
const LENS_LAB: Partial<Record<string, { view: LabViewId; label: string }>> = {
  iv_rank: { view: 'iv-rank', label: 'IV rank' },
  vrp: { view: 'vrp', label: 'VRP' },
  atm_slope: { view: 'skew', label: 'Surface' },
  pin: { view: 'opex', label: 'OpEx' },
  terrain: { view: 'model', label: 'Terrain' },
}

export function VolWhyInspector({
  row,
  weights,
  score,
  rank,
  total,
  onClose,
}: {
  row: VolRow
  weights: VolWeights
  score: number | null
  rank: number
  total: number
  onClose: () => void
}) {
  const parts = compositeParts(row, weights)
  const max = Math.max(1, ...parts.map((p) => p.points ?? 0))

  // The loudest lens, by distance from its own middle. It decides which
  // similar-regime question is worth asking.
  const loudest = parts
    .filter((p) => p.value != null)
    .sort((a, b) => Math.abs((b.value ?? 50) - 50) - Math.abs((a.value ?? 50) - 50))[0]
  const regimeLens = loudest ? REGIME_LENS[loudest.key] : undefined
  const regimeValue =
    loudest?.key === 'terrain'
      ? row.regime
      : loudest?.key === 'atm_slope'
        ? row.raw.slope
        : loudest?.key === 'pin'
          ? row.raw.pinPct
          : loudest?.key === 'vrp'
            ? row.raw.vrp
            : row.raw.ivRank

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className={SECTION_CAP_CLASS}>Why</span>
        <Link
          to={withSymbolParam(SYMBOL_PATH, row.symbol)}
          className="font-mono text-dense-body font-bold text-entity-symbol hover:underline"
        >
          {row.symbol}
        </Link>
        <span className="font-mono text-dense-body font-semibold tabular-nums">
          {score == null ? '—' : score.toFixed(1)}
        </span>
        {row.regime ? (
          <DenseTag variant={regimeVariant(row.regime)} size="cell">
            {row.regime}
          </DenseTag>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded px-1.5 py-0.5 text-dense-meta text-muted-foreground hover:bg-secondary"
          aria-label="Close"
        >
          esc
        </button>
      </header>

      <div className="flex flex-col gap-3 px-3 py-3">
        <p className="text-dense-meta text-muted-foreground">
          {rank} of {total} at these weights
          {row.serverScore != null ? (
            <> · the server scored it {row.serverScore.toFixed(1)} at its own</>
          ) : null}
          {' · j k walk the list'}
        </p>

        <div>
          <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Points, by lens</div>
          <div className="flex flex-col gap-1.5">
            {parts.map((p) => {
              const lab = LENS_LAB[p.key]
              return (
                <div
                  key={p.key}
                  className="grid grid-cols-[4.5rem_3.5rem_minmax(0,1fr)_3rem] items-center gap-2"
                >
                  {lab ? (
                    <Link
                      to={labHref(lab.view, row.symbol)}
                      className="truncate text-dense-label hover:underline"
                      title={`Read ${row.symbol} on ${lab.label}`}
                    >
                      {p.label}
                    </Link>
                  ) : (
                    <span className="text-dense-label">{p.label}</span>
                  )}
                  <span className="truncate text-right font-mono text-dense-label tabular-nums text-muted-foreground">
                    {p.reading}
                  </span>
                  <span className="relative block h-1.5 rounded-sm bg-secondary">
                    {p.points != null ? (
                      <span
                        className="absolute inset-y-0 left-0 rounded-sm bg-primary/60"
                        style={{ width: `${Math.max(2, (p.points / max) * 100)}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="text-right font-mono text-dense-label tabular-nums">
                    {p.points == null ? (
                      <span
                        className="text-muted-foreground"
                        title={
                          p.weight <= 0
                            ? 'You set this lens to zero.'
                            : 'This name carries no reading for this lens, so it is left out of both halves rather than counted as zero.'
                        }
                      >
                        {p.weight <= 0 ? 'off' : '—'}
                      </span>
                    ) : (
                      p.points.toFixed(1)
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-dense-caption leading-relaxed text-muted-foreground">
            Points are the lens score × its weight over the weight actually applied, so they sum to
            the composite. The middle column is the reading in its own units — two percentiles, a
            30-day slope, a distance in percent of spot, and the terrain’s own word — and each lens
            name opens the page that reads it in full. Terrain scores on{' '}
            <span className="font-mono">pin_score</span> from the terrain model, which is a
            different field from the Pin lens beside it.
          </p>
        </div>

        <div>
          <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Similar regime</div>
          {regimeLens && regimeValue != null ? (
            <SimilarRegimeCard lens={regimeLens} symbol={row.symbol} value={regimeValue} />
          ) : (
            <p className="text-dense-caption leading-relaxed text-muted-foreground">
              No lens on this name is far enough from its middle to ask the question with.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
