/**
 * Correlation over time — book pairs' 60d rolling ρ, the line behind the
 * matrix cell Risk · Portfolio Exposure prints.
 *
 * The pairs come off Risk's own matrix; every point on the line is that same
 * matrix read as of its session (`/analytics/risk/correlation?as_of=`, research
 * 0.124.0), so the line ends where the matrix reads and the number has one
 * implementation. Until then the page recomputed the definition over the
 * plugin's closes and flagged the two disagreeing.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchRiskCorrelation } from '@/api/research/riskStats'
import { CORR_WINDOW, useRiskExposure } from '@/hooks/useRiskExposure'
import { cn } from '@/lib/utils'
import { seriesFromMatrices, topPairs, weekdaysBack, type RollingPoint } from './historyCorr'

const STROKES = ['stroke-warning', 'stroke-entity-symbol', 'stroke-entity-option'] as const
const SWATCH = ['bg-warning', 'bg-entity-symbol', 'bg-entity-option'] as const

/** About six months of sessions, one matrix read per weekday. */
const DRAWN = 126

export function HistoryCorrelation() {
  const { matrix, corrSymbols, corrQuery } = useRiskExposure('all')
  const pairs = useMemo(() => topPairs(matrix, corrSymbols, 3), [matrix, corrSymbols])
  const syms = useMemo(
    () => [...new Set(pairs.flatMap((p) => [p.a, p.b]))].sort(),
    [pairs]
  )
  // Walk back from the session today's matrix rests on; the server names the
  // session each read answers for, so holidays fold into the day before.
  const asOf = corrQuery.data?.as_of ?? null
  const dates = useMemo(() => (asOf && syms.length >= 2 ? weekdaysBack(asOf, DRAWN) : []), [asOf, syms.length])
  const readings = useQueries({
    queries: dates.map((d) => ({
      queryKey: ['research', 'risk', 'correlation', 'as-of', syms.join(','), CORR_WINDOW, d],
      queryFn: () => fetchRiskCorrelation(syms, CORR_WINDOW, d),
      staleTime: 30 * 60_000,
    })),
  })
  const pending = readings.filter((q) => q.isLoading).length
  const failed = readings.filter((q) => q.isError)
  const answers = readings.map((q) => q.data)

  if (corrQuery.isLoading || pending > 0) {
    return (
      <p className="px-3 py-4 text-dense-meta text-muted-foreground">
        Reading the book&apos;s pairs…{dates.length > 0 ? ` ${dates.length - pending} of ${dates.length} sessions` : ''}
      </p>
    )
  }
  if (pairs.length === 0) {
    return (
      <p className="px-3 py-4 text-dense-meta text-muted-foreground">
        Risk&apos;s matrix reads no pair for the book — with under two stock names, correlation has
        nothing to say.
      </p>
    )
  }
  if (dates.length > 0 && failed.length === dates.length) {
    return (
      <p className="px-3 py-4 text-dense-meta text-warning">
        Research&apos;s matrix did not answer for any session: {String(failed[0].error)}
      </p>
    )
  }

  const lines = pairs.map((p, i) => ({
    ...p,
    series: seriesFromMatrices(p, answers),
    stroke: STROKES[i % 3],
    swatch: SWATCH[i % 3],
  }))
  const drawn = lines.filter((l) => l.series.length > 1)
  const all: RollingPoint[] = drawn.flatMap((l) => l.series)
  if (all.length === 0) {
    return (
      <p className="px-3 py-4 text-dense-meta text-muted-foreground">
        Research&apos;s matrix fills no {CORR_WINDOW}-session window for these pairs over the drawn
        sessions — the closes do not reach back far enough.
      </p>
    )
  }
  const lo = Math.min(...all.map((p) => p.rho), 0.2) - 0.05
  const hi = Math.max(...all.map((p) => p.rho), 0.9) + 0.05
  const W = 560
  const H = 170
  const plotH = 150
  const y = (v: number) => plotH - ((v - lo) / (hi - lo)) * (plotH - 10)
  const grid = []
  for (let v = Math.ceil(lo * 4) / 4; v <= hi; v += 0.25) grid.push(v)

  const top = drawn[0]
  const rise = top && top.series.length > 1 ? top.series[top.series.length - 1].rho - top.series[0].rho : 0

  return (
    <div className="px-3 py-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Rolling 60-day correlation for the book's tightest pairs">
        {grid.map((v) => (
          <g key={v}>
            <line x1="26" x2={W - 4} y1={y(v)} y2={y(v)} className="stroke-[var(--sk-surface)]" strokeWidth="1" />
            <text x="0" y={y(v) + 3} className="fill-muted-foreground font-mono" fontSize="9">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {drawn.map((l) => (
          <polyline
            key={l.label}
            className={l.stroke}
            fill="none"
            strokeWidth="1.6"
            points={l.series
              .map((p, i) => `${(26 + (i / (l.series.length - 1)) * (W - 32)).toFixed(1)},${y(p.rho).toFixed(1)}`)
              .join(' ')}
          />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-dense-caption">
        {drawn.map((l) => (
          <span key={l.label} className="text-secondary-foreground">
            <span className={cn('mr-1 inline-block h-0.5 w-3.5 align-[3px]', l.swatch)} />
            {l.label}{' '}
            <span className="font-mono font-semibold text-foreground">{l.series[l.series.length - 1].rho.toFixed(2)}</span>
          </span>
        ))}
      </div>
      <p className="m-0 mt-1.5 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        {top
          ? `${top.label} is the book's tightest pair at ${top.series[top.series.length - 1].rho.toFixed(2)}${
              rise > 0.02 ? ' and still climbing' : rise < -0.02 ? ' and easing' : ' and flat'
            } over the drawn window. Pairs come from Risk's matrix, and every point is that matrix read as of its session — shared dates, log returns, ${CORR_WINDOW}-session Pearson — so the line ends where Risk reads.`
          : ''}
        {failed.length > 0 ? ` ${failed.length} of ${dates.length} sessions did not answer; the line skips them.` : ''}
      </p>
    </div>
  )
}
