/**
 * Why this name scores what it scores.
 *
 * The design opens this on a row click, and it is the reason the page exists:
 * the composite is only worth ranking on if you can take it apart. Each lens
 * shows its score, the weight you gave it, and the points that product
 * contributed — and the points sum to the number in the Comp column, so the
 * panel is a proof rather than a restatement.
 *
 * What it does not show is the design's "settled record for this path · grade
 * (38 prior instances)". Nothing joins a path/grade pair to its own forward
 * returns on this side; the candidate outcome store settles *candidates*, not
 * ratings rows. The panel says so where that paragraph would be.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SECTION_CAP_CLASS } from '@/components/layout'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { cn } from '@/lib/utils'
import {
  GROWTH_CHECKS,
  TREND_CHECKS,
  compositeParts,
  pathVariant,
  type RatingRow,
  type RatingWeights,
} from './stockRatingsModel'

export function WhyInspector({
  row,
  weights,
  score,
  serverScore,
  rank,
  total,
  onClose,
}: {
  row: RatingRow
  weights: RatingWeights
  score: number | null
  serverScore: number | null
  rank: number
  total: number
  onClose: () => void
}) {
  const parts = compositeParts(row, weights)
  const max = Math.max(1, ...parts.map((p) => p.points ?? 0))
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
        <DenseTag variant={pathVariant(row.path)} size="cell">
          {[row.grade, row.path].filter(Boolean).join(' · ') || '—'}
        </DenseTag>
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
          {serverScore != null ? (
            <> · the server scored it {serverScore.toFixed(1)} at its own</>
          ) : null}
        </p>

        <div>
          <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Points, by lens</div>
          <div className="flex flex-col gap-1.5">
            {parts.map((p) => {
              const passes =
                p.key === 'trend'
                  ? { n: row.passes.trend, out: TREND_CHECKS }
                  : p.key === 'growth'
                    ? { n: row.passes.growth, out: GROWTH_CHECKS }
                    : null
              return (
                <div
                  key={p.key}
                  className="grid grid-cols-[4.5rem_3.5rem_minmax(0,1fr)_3rem] items-center gap-2"
                >
                  <span className="text-dense-label">{p.label}</span>
                  <span className="text-right font-mono text-dense-label tabular-nums text-muted-foreground">
                    {passes?.n != null
                      ? `${passes.n}/${passes.out}`
                      : p.value == null
                        ? '—'
                        : p.value.toFixed(0)}
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
                            : 'This name carries no score for this lens, so it is left out of both halves rather than counted as zero.'
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
            Points are score × weight over the weight actually applied, so they sum to the
            composite — including when a lens is missing, which is why a thinly-scored name is not
            pushed down for being thin. Each is rounded to a tenth on its own, so adding the
            column up can land a tenth either side of the number above.
          </p>
        </div>

        <div>
          <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Settled record</div>
          <p className="text-dense-caption leading-relaxed text-muted-foreground">
            The design puts the path’s own track record here — how {row.path ?? 'this path'} at
            grade {row.grade ?? '—'} has gone before. Nothing joins a path/grade pair to its
            forward returns on this side: the outcome store settles candidates the loop nominated,
            not rows of this list, so there is no prior set to count.
          </p>
        </div>
      </div>
    </div>
  )
}
