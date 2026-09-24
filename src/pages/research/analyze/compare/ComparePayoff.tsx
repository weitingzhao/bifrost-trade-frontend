/**
 * Payoff at expiry — each structure that is switched on, at its chosen size,
 * over one price axis, with spot dashed.
 *
 * The prototype shades the 20-day distribution's p10–p90 behind the curves;
 * that distribution is one of the three inputs this plan does not carry, so
 * the band is not drawn and the caption says so rather than leaving a gap
 * that reads as "no range".
 */
import { cn } from '@/lib/utils'

export interface PayoffCurve {
  key: string
  /** Tailwind stroke class — one of the page's series tokens. */
  stroke: string
  /** P&L at expiry for the whole chosen size, or null where a leg is unpriced. */
  at: (price: number) => number | null
}

const W = 640
const H = 240
const PAD = { top: 12, right: 10, bottom: 24, left: 52 }

export function ComparePayoff({
  curves,
  spot,
  lo,
  hi,
  className,
}: {
  curves: readonly PayoffCurve[]
  spot: number
  lo: number
  hi: number
  className?: string
}) {
  if (curves.length === 0 || !(hi > lo)) {
    return (
      <p className={cn('py-10 text-center text-dense-meta text-muted-foreground', className)}>
        Switch a placed structure on in the table to draw its payoff.
      </p>
    )
  }
  const steps = 120
  const prices = Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps)
  const series = curves.map((c) => ({ c, pts: prices.map((p) => [p, c.at(p)] as const) }))
  const ys = series.flatMap((s) => s.pts.map(([, v]) => v).filter((v): v is number => v != null))
  const yMin = Math.min(0, ...ys)
  const yMax = Math.max(0, ...ys)
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const x = (p: number) => PAD.left + ((p - lo) / (hi - lo)) * chartW
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * chartH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f)
  const dollars = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className={cn('block', className)} role="img" aria-label="Payoff at expiry">
      <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth={1} />
      <text x={4} y={y(0) + 3} className="fill-muted-foreground font-mono text-dense-micro">
        $0
      </text>
      <text x={4} y={PAD.top + 8} className="fill-muted-foreground font-mono text-dense-micro">
        {dollars(yMax)}
      </text>
      <text x={4} y={PAD.top + chartH} className="fill-muted-foreground font-mono text-dense-micro">
        {dollars(yMin)}
      </text>
      <line x1={x(spot)} x2={x(spot)} y1={PAD.top} y2={PAD.top + chartH} className="stroke-muted-foreground/60" strokeDasharray="3 4" />
      <text x={x(spot)} y={PAD.top - 2} textAnchor="middle" className="fill-muted-foreground font-mono text-dense-micro">
        spot {spot.toFixed(2)}
      </text>
      {series.map(({ c, pts }) => (
        <polyline
          key={c.key}
          points={pts
            .filter(([, v]) => v != null)
            .map(([p, v]) => `${x(p).toFixed(1)},${y(v as number).toFixed(1)}`)
            .join(' ')}
          fill="none"
          className={c.stroke}
          strokeWidth={1.8}
        />
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-dense-micro">
          {t.toFixed(t >= 100 ? 0 : 1)}
        </text>
      ))}
    </svg>
  )
}
