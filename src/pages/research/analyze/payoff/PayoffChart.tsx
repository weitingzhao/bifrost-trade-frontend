/**
 * The Payoff face's own drawing — profit and loss at expiry and today across
 * underlying prices, in the design's 900 × 260 frame.
 *
 * The solid line is the one payoff engine's (`structureValueAt` at T = 0, the
 * same `payoffOptionsAtPrice` Positions charts); the dashed line is today's
 * mark under Black–Scholes with IV unchanged. The ±1σ / ±2σ bands come from
 * the anchor contract's own IV, the spot line wears the ticker's colour, and
 * the break-even is a dotted vertical the eye can carry down to the axis. When
 * the expiry holds the estimated earnings print, the two gap levels the Chain
 * face rules are amber dashed verticals (`gap`).
 */
import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { PayoffCurves } from './payoffModel'

const W = 900
const H = 260
const PLOT_H = 240

function path(
  xs: readonly number[],
  ys: readonly number[],
  x: (v: number) => number,
  y: (v: number) => number
): string {
  return xs
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(v).toFixed(1)} ${y(ys[i]).toFixed(1)}`)
    .join('')
}

export interface PayoffGapLevels {
  lo: number
  hi: number
  title?: string
}

export function PayoffChart({
  curves,
  spot,
  gap = null,
}: {
  curves: PayoffCurves
  spot: number
  gap?: PayoffGapLevels | null
}) {
  const clip = useId().replace(/:/g, '_')
  const { xs, atExpiry, today, sigma, breakeven } = curves
  const lo = xs[0]
  const hi = xs[xs.length - 1]
  const all = [...atExpiry, ...today]
  const vLo = Math.min(...all)
  const vHi = Math.max(...all)
  const pad = (vHi - vLo) * 0.08 || 1
  const x = (v: number) => ((v - lo) / (hi - lo)) * W
  const y = (v: number) => PLOT_H - ((v - (vLo - pad)) / (vHi + pad - (vLo - pad))) * PLOT_H

  // The win and lose areas hug the expiry line's own sides of zero.
  const zeroY = y(0)
  const winPath =
    path(
      xs,
      atExpiry.map((v) => Math.max(0, v)),
      x,
      y
    ) + `L${W} ${zeroY.toFixed(1)}L0 ${zeroY.toFixed(1)}Z`
  const losePath =
    path(
      xs,
      atExpiry.map((v) => Math.min(0, v)),
      x,
      y
    ) + `L${W} ${zeroY.toFixed(1)}L0 ${zeroY.toFixed(1)}Z`

  const band = (n: number) => {
    const x0 = x(spot * Math.exp(-n * sigma))
    const x1 = x(spot * Math.exp(n * sigma))
    return { x0: Math.max(0, x0), w: Math.min(W, x1) - Math.max(0, x0) }
  }
  const s1 = band(1)
  const s2 = band(2)

  const axis = [0, 0.25, 0.5, 0.75, 1].map((t) => (lo + (hi - lo) * t).toFixed(0))
  const gapMarks = gap
    ? [
        { k: gap.lo, label: `E −gap ${gap.lo}` },
        { k: gap.hi, label: `E +gap ${gap.hi}` },
      ].filter((m) => m.k > lo && m.k < hi)
    : []

  return (
    <div className="min-w-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Profit and loss at expiry and today across underlying prices ${axis[0]}–${axis[4]}`}
        >
          <clipPath id={clip}>
            <rect x="0" y="0" width={W} height={PLOT_H} />
          </clipPath>
          {/* ±2σ then ±1σ, so the inner band reads darker where they stack. */}
          <rect
            x={s2.x0}
            y="0"
            width={Math.max(0, s2.w)}
            height={PLOT_H}
            fill="color-mix(in srgb, var(--sk-ink) 3%, transparent)"
          />
          <rect
            x={s1.x0}
            y="0"
            width={Math.max(0, s1.w)}
            height={PLOT_H}
            fill="color-mix(in srgb, var(--sk-ink) 4%, transparent)"
          />
          <g clipPath={`url(#${clip})`}>
            {/* The zone above zero is profit's own ink, not the accent (Rev .83):
                it is signed P&L, split at the zero axis like Positions and
                Performance (§14.7 #5). */}
            <path d={winPath} fill="color-mix(in srgb, var(--color-profit) 18%, transparent)" />
            <path d={losePath} fill="color-mix(in srgb, var(--color-loss) 18%, transparent)" />
          </g>
          <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--sk-line2)" strokeWidth="1" />
          <g clipPath={`url(#${clip})`}>
            <path
              d={path(xs, today, x, y)}
              fill="none"
              stroke="var(--sk-mute2)"
              strokeWidth="1.4"
              strokeDasharray="5 3"
            />
            <path d={path(xs, atExpiry, x, y)} fill="none" stroke="var(--sk-ink)" strokeWidth="2" />
          </g>
          <line
            x1={x(spot)}
            x2={x(spot)}
            y1="0"
            y2={PLOT_H}
            stroke="var(--sk-ticker)"
            strokeWidth="1"
          />
          {gapMarks.map((m) => (
            <line
              key={m.label}
              x1={x(m.k)}
              x2={x(m.k)}
              y1="0"
              y2={PLOT_H}
              className="stroke-warning"
              strokeWidth="1.25"
              strokeDasharray="3 2"
            >
              {gap?.title ? <title>{gap.title}</title> : null}
            </line>
          ))}
          {breakeven != null ? (
            <line
              x1={x(breakeven)}
              x2={x(breakeven)}
              y1="0"
              y2={PLOT_H}
              stroke="var(--sk-ink)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          ) : null}
        </svg>
        <span className="pointer-events-none absolute right-1 top-1 font-mono text-dense-micro text-muted-foreground">
          +${Math.round(vHi).toLocaleString()}
        </span>
        <span className="pointer-events-none absolute bottom-3 right-1 font-mono text-dense-micro text-muted-foreground">
          −${Math.abs(Math.round(vLo)).toLocaleString()}
        </span>
        <span
          className="pointer-events-none absolute top-0 -translate-x-1/2 font-mono text-dense-micro text-[var(--sk-ticker)]"
          style={{ left: `${((spot - lo) / (hi - lo)) * 100}%` }}
        >
          spot
        </span>
        {gapMarks.map((m) => (
          <span
            key={m.label}
            className="pointer-events-none absolute top-3.5 -translate-x-1/2 whitespace-nowrap font-mono text-dense-micro text-warning"
            style={{ left: `${((m.k - lo) / (hi - lo)) * 100}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex justify-between pt-0.5 font-mono text-dense-caption text-muted-foreground">
        {axis.map((a, i) => (
          <span key={i}>{a}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 pt-1.5 text-dense-caption text-muted-foreground">
        <Legend
          swatch={<i className="w-3.5 border-t-2 border-[var(--sk-ink)]" />}
          label="at expiry"
        />
        <Legend
          swatch={<i className="w-3.5 border-t-2 border-dashed border-[var(--sk-mute2)]" />}
          label="today (T+0, IV unchanged)"
        />
        <Legend
          swatch={
            <i className="h-2.5 w-2.5 bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)]" />
          }
          label="±1σ / ±2σ from the contract's IV"
        />
        <Legend swatch={<i className="h-2.5 w-px bg-[var(--sk-ticker)]" />} label="spot" />
        {breakeven != null ? (
          <Legend
            swatch={<i className="h-2.5 w-px border-l border-dashed border-[var(--sk-ink)]" />}
            label="break-even"
          />
        ) : null}
        {gapMarks.length > 0 ? (
          <Legend
            swatch={<i className="h-2.5 w-0 border-l-2 border-dashed border-warning" />}
            label="earnings ±gap (estimated print)"
          />
        ) : null}
      </div>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5')}>
      {swatch}
      {label}
    </span>
  )
}
