/**
 * Realised vol by horizon — the p05–p95 and p20–p80 bands, the median dashed,
 * and today's implied vol as dots where a listed expiry lets it be placed.
 *
 * One scale places everything: the y axis runs over the bands and the dots
 * together, and the grid labels are values that scale reaches.
 */
import { cn } from '@/lib/utils'

/** Where today's implied sits against the cone — the reading face's word. */
export type ConePlace = 'above-p80' | 'above-median' | 'below-median' | 'unread'

/**
 * One tenor's band. Lives with the drawing since the Method face became its
 * second reader (§14.2): both faces feed it, only History computes `place`.
 */
export interface ConeRow {
  days: number
  p05: number | null
  p20: number | null
  p50: number | null
  p80: number | null
  p95: number | null
  /** Windows the percentiles were taken over. */
  n: number
  ivToday: number | null
  place: ConePlace
}

const W = 560
const H = 210
const PAD = { top: 10, right: 16, bottom: 26, left: 34 }

export function VolCone({ rows, className }: { rows: readonly ConeRow[]; className?: string }) {
  const usable = rows.filter((r) => r.p05 != null && r.p95 != null)
  if (usable.length < 2) {
    return (
      <p className={cn('py-8 text-center text-dense-meta text-muted-foreground', className)}>
        Not enough daily closes to draw a cone.
      </p>
    )
  }

  const values = usable.flatMap((r) => [r.p05!, r.p95!, ...(r.ivToday != null ? [r.ivToday] : [])])
  const step = 0.1
  const lo = Math.max(0, Math.floor(Math.min(...values) / step) * step)
  const hi = Math.ceil(Math.max(...values) / step) * step
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (i / (usable.length - 1)) * chartW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * chartH

  const band = (top: keyof ConeRow, bottom: keyof ConeRow) =>
    [
      ...usable.map((r, i) => `${x(i).toFixed(1)},${y(r[top] as number).toFixed(1)}`),
      ...usable.map((r, i) => `${x(i).toFixed(1)},${y(r[bottom] as number).toFixed(1)}`).reverse(),
    ].join(' ')

  const grid: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) grid.push(Number(v.toFixed(2)))

  const placed = usable.map((r, i) => ({ r, i })).filter(({ r }) => r.ivToday != null)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={cn('block', className)}
      role="img"
      aria-label="Realised volatility cone with today's implied volatility"
    >
      {grid.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={0} y={y(v) + 3} className="fill-muted-foreground font-mono text-dense-micro">
            {Math.round(v * 100)}
          </text>
        </g>
      ))}
      <polygon points={band('p95', 'p05')} className="fill-muted-foreground/15" />
      <polygon points={band('p80', 'p20')} className="fill-muted-foreground/25" />
      <polyline
        points={usable
          .filter((r) => r.p50 != null)
          .map((r) => `${x(usable.indexOf(r)).toFixed(1)},${y(r.p50!).toFixed(1)}`)
          .join(' ')}
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      {placed.length > 1 ? (
        <polyline
          points={placed
            .map(({ r, i }) => `${x(i).toFixed(1)},${y(r.ivToday!).toFixed(1)}`)
            .join(' ')}
          fill="none"
          className="stroke-primary"
          strokeWidth={1.8}
        />
      ) : null}
      {placed.map(({ r, i }) => (
        <circle key={r.days} cx={x(i)} cy={y(r.ivToday!)} r={3.5} className="fill-primary">
          <title>
            {`${r.days}d · IV ${(r.ivToday! * 100).toFixed(1)} · realised median ${r.p50 == null ? '—' : (r.p50 * 100).toFixed(1)} over ${r.n} windows`}
          </title>
        </circle>
      ))}
      {usable.map((r, i) => (
        <text
          key={r.days}
          x={x(i)}
          y={H - 6}
          textAnchor="middle"
          className={cn(
            'font-mono text-dense-micro',
            r.ivToday == null ? 'fill-muted-foreground/60' : 'fill-muted-foreground'
          )}
        >
          {r.days}d
        </text>
      ))}
    </svg>
  )
}
