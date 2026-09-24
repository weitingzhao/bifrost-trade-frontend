/**
 * Correlation over time — book pairs' 60d rolling ρ, the line behind the
 * matrix cell Risk · Portfolio Exposure prints.
 *
 * The pairs come off Risk's own matrix (the committed reading); the line is
 * this page recomputing the same definition over the store's closes, and the
 * legend prints both ends — a drift between them is shown in amber, never
 * hidden, which is what earns the second implementation its place.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDailyClosesMulti } from '@/api/marketData/dailyBars'
import { CORR_WINDOW, useRiskExposure } from '@/hooks/useRiskExposure'
import { cn } from '@/lib/utils'
import {
  alignedLogReturns,
  rollingPearson,
  topPairs,
  type RollingPoint,
} from './historyCorr'

const STROKES = ['stroke-warning', 'stroke-entity-symbol', 'stroke-entity-option'] as const
const SWATCH = ['bg-warning', 'bg-entity-symbol', 'bg-entity-option'] as const

const DRAWN = 126
/** Past this the line's end and the matrix are two readings, said out loud. */
const DRIFT_TOL = 0.05

export function HistoryCorrelation() {
  const { matrix, corrSymbols, corrQuery } = useRiskExposure('all')
  const pairs = useMemo(() => topPairs(matrix, corrSymbols, 3), [matrix, corrSymbols])
  const syms = useMemo(
    () => [...new Set(pairs.flatMap((p) => [p.a, p.b]))].sort(),
    [pairs]
  )
  const closesQ = useQuery({
    queryKey: ['market', 'closes-multi', 'corr', syms.join(',')],
    queryFn: () => fetchDailyClosesMulti(syms, 300),
    enabled: syms.length > 0,
    staleTime: 10 * 60_000,
  })

  const lines = useMemo(() => {
    const closes = closesQ.data
    if (!closes) return []
    return pairs.map((p, i) => {
      const { l, r, dates } = alignedLogReturns(closes[p.a] ?? [], closes[p.b] ?? [])
      const series = rollingPearson(l, r, dates, CORR_WINDOW).slice(-DRAWN)
      return { ...p, series, stroke: STROKES[i % 3], swatch: SWATCH[i % 3] }
    })
  }, [closesQ.data, pairs])

  if (corrQuery.isLoading || (syms.length > 0 && closesQ.isLoading)) {
    return <p className="px-3 py-4 text-dense-meta text-muted-foreground">Reading the book&apos;s pairs…</p>
  }
  if (pairs.length === 0) {
    return (
      <p className="px-3 py-4 text-dense-meta text-muted-foreground">
        Risk&apos;s matrix reads no pair for the book — with under two stock names, correlation has
        nothing to say.
      </p>
    )
  }

  const drawn = lines.filter((l) => l.series.length > 1)
  const all: RollingPoint[] = drawn.flatMap((l) => l.series)
  if (all.length === 0) {
    return (
      <p className="px-3 py-4 text-dense-meta text-muted-foreground">
        The closes reach fewer than {CORR_WINDOW} shared sessions for every pair — the rolling
        window never fills.
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
        {drawn.map((l) => {
          const last = l.series[l.series.length - 1].rho
          const drift = Math.abs(last - l.matrixRho)
          return (
            <span key={l.label} className="text-secondary-foreground">
              <span className={cn('mr-1 inline-block h-0.5 w-3.5 align-[3px]', l.swatch)} />
              {l.label}{' '}
              <span className="font-mono font-semibold text-foreground">{last.toFixed(2)}</span>
              {drift > DRIFT_TOL ? (
                <span
                  className="ml-1 font-mono text-warning"
                  title="This line's endpoint and Risk's matrix disagree past 0.05 — two readings, and the matrix is the committed one."
                >
                  matrix {l.matrixRho.toFixed(2)}
                </span>
              ) : null}
            </span>
          )
        })}
      </div>
      <p className="m-0 mt-1.5 text-dense-caption leading-relaxed text-muted-foreground text-pretty">
        {top
          ? `${top.label} is the book's tightest pair at ${top.series[top.series.length - 1].rho.toFixed(2)}${
              rise > 0.02 ? ' and still climbing' : rise < -0.02 ? ' and easing' : ' and flat'
            } over the drawn window. Pairs and the committed ρ come from Risk's matrix; the line is the same definition — shared dates, log returns, ${CORR_WINDOW}-session Pearson — walked back through the store's closes.`
          : ''}
      </p>
    </div>
  )
}
