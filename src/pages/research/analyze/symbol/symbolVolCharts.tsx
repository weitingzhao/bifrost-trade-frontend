/**
 * The Volatility face's two drawings (design `Research Symbol.dc.html`,
 * §isVol): the ATM term curve (the repaired ATM IV store, not the fit) with
 * realised vol at each horizon, and the skew smile with both sides drawn
 * against the raw-SVI fit.
 *
 * Only what a store answers is drawn. The term panel's 1y cone needs a
 * per-horizon history no store keeps, and stays in the panel's footer as owed.
 * The earnings line is Research's estimate of the next print (research
 * 0.125.0) and the panel says it is one.
 */
import { sviIvPts, type SviParams } from '@/utils/sviSmile'
import type { TermEvent } from '@/utils/earningsEstimate'

export interface TermCurvePoint {
  dte: number
  iv: number
}

/** Realised vol over roughly the same horizon, from the name's own closes. */
export interface TermRvPoint {
  dte: number
  rv: number
}

const W = 620
const H = 170
const PAD_X = 26
const PAD_Y = 16

function scaler(vals: number[], lo: number, hi: number) {
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  const span = mx - mn || 1
  return (v: number) => lo + ((v - mn) / span) * (hi - lo)
}

export function TermCurveChart({
  points,
  rv,
  selDte,
  event = null,
}: {
  points: readonly TermCurvePoint[]
  rv: readonly TermRvPoint[]
  selDte: number | null
  /** The design's amber line at the next earnings print, in days to expiry. */
  event?: TermEvent | null
}) {
  if (points.length < 2) return null
  const dtes = [...points.map((p) => p.dte), ...rv.map((r) => r.dte)]
  const ivs = [...points.map((p) => p.iv), ...rv.map((r) => r.rv)]
  const X = scaler(dtes, PAD_X, W - PAD_X)
  const Y = scaler(ivs, H - PAD_Y, PAD_Y)
  const line = (ps: readonly { dte: number; v: number }[]) =>
    ps.map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.dte).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')
  const hi = Math.max(...ivs)
  const lo = Math.min(...ivs)
  const ex = event && event.dte >= Math.min(...dtes) && event.dte <= Math.max(...dtes) ? X(event.dte) : null
  return (
    <div className="relative px-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        aria-label="ATM IV today by horizon, with realised vol at roughly the matching horizon"
      >
        <line x1="0" x2={W} y1={H - PAD_Y + 6} y2={H - PAD_Y + 6} stroke="var(--sk-line)" strokeWidth="1" />
        {event && ex != null ? (
          <g data-term-event={event.dte}>
            <line x1={ex} x2={ex} y1={8} y2={H - PAD_Y + 6} className="stroke-warning" strokeWidth="1.25" strokeDasharray="2 3" />
            <text
              x={ex > W - 90 ? ex - 4 : ex + 4}
              y={24}
              textAnchor={ex > W - 90 ? 'end' : 'start'}
              className="fill-warning font-mono text-dense-micro"
            >
              <title>{event.title}</title>
              {event.label}
            </text>
          </g>
        ) : null}
        {rv.length >= 2 ? (
          <path
            d={line(rv.map((r) => ({ dte: r.dte, v: r.rv })))}
            fill="none"
            stroke="var(--sk-mute2, #98a2b0)"
            strokeWidth="1.3"
          />
        ) : null}
        <path
          d={line(points.map((p) => ({ dte: p.dte, v: p.iv })))}
          fill="none"
          stroke="var(--sk-ticker)"
          strokeWidth="1.8"
        />
        {points.map((p) => (
          <circle
            key={p.dte}
            cx={X(p.dte)}
            cy={Y(p.iv)}
            r={selDte != null && p.dte === selDte ? 3.6 : 2.6}
            fill="var(--sk-ticker)"
          />
        ))}
        {points.map((p) => (
          <text
            key={`t${p.dte}`}
            x={X(p.dte)}
            y={H - 2}
            textAnchor="middle"
            className="fill-[var(--sk-mute,#7a8492)] font-mono text-dense-micro"
          >
            {p.dte}d
          </text>
        ))}
      </svg>
      <span className="pointer-events-none absolute right-4 top-1 font-mono text-dense-micro text-muted-foreground">
        {hi.toFixed(0)}%
      </span>
      <span className="pointer-events-none absolute bottom-6 right-4 font-mono text-dense-micro text-muted-foreground">
        {lo.toFixed(0)}%
      </span>
    </div>
  )
}

export interface SkewSidePoint {
  strike: number
  iv: number
}

export function SkewSurfaceChart({
  puts,
  calls,
  fit,
  fitT,
  nextFit,
  nextT,
  spot,
  richBp,
}: {
  puts: readonly SkewSidePoint[]
  calls: readonly SkewSidePoint[]
  /** The selected expiry's SVI params, evaluated across the strike domain. */
  fit: SviParams | null
  fitT: number | null
  /** The next listed expiry's fit — the design's grey companion line. */
  nextFit: SviParams | null
  nextT: number | null
  spot: number | null
  /** Marks strikes whose market IV sits further than this from the fit, in bp. */
  richBp: number
}) {
  const all = [...puts, ...calls]
  if (all.length < 3 || spot == null || spot <= 0) return null
  const strikes = all.map((p) => p.strike)
  const kOf = (K: number) => Math.log(K / spot)
  const evalFit = (p: SviParams, t: number, K: number) => sviIvPts(p, kOf(K), t)
  const ivs = [
    ...all.map((p) => p.iv),
    ...(fit && fitT ? strikes.map((K) => evalFit(fit, fitT, K)) : []),
  ]
  const X = scaler(strikes, PAD_X, W - PAD_X)
  const Y = scaler(ivs, H - PAD_Y, PAD_Y)
  const sideLine = (ps: readonly SkewSidePoint[]) =>
    [...ps]
      .sort((a, b) => a.strike - b.strike)
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.strike).toFixed(1)},${Y(p.iv).toFixed(1)}`)
      .join(' ')
  const curve = (p: SviParams, t: number) => {
    const mn = Math.min(...strikes)
    const mx = Math.max(...strikes)
    const pts: string[] = []
    for (let i = 0; i <= 40; i++) {
      const K = mn + ((mx - mn) * i) / 40
      pts.push(`${i === 0 ? 'M' : 'L'}${X(K).toFixed(1)},${Y(evalFit(p, t, K)).toFixed(1)}`)
    }
    return pts.join(' ')
  }
  const rich = fit && fitT
    ? all.filter((p) => Math.abs(p.iv - evalFit(fit, fitT, p.strike)) * 100 > richBp)
    : []
  const ticks = [...new Set(strikes)].sort((a, b) => a - b).filter((_, i, arr) => i % Math.ceil(arr.length / 7) === 0)
  return (
    <div className="relative px-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        aria-label="Market IV by strike, puts and calls, against the raw-SVI fit"
      >
        <line x1="0" x2={W} y1={H - PAD_Y + 6} y2={H - PAD_Y + 6} stroke="var(--sk-line)" strokeWidth="1" />
        {nextFit && nextT ? (
          <path d={curve(nextFit, nextT)} fill="none" stroke="var(--sk-line2, #3d4754)" strokeWidth="1.2" />
        ) : null}
        {fit && fitT ? (
          <path d={curve(fit, fitT)} fill="none" stroke="var(--sk-mute2, #98a2b0)" strokeWidth="1.3" strokeDasharray="4 3" />
        ) : null}
        <path d={sideLine(puts)} fill="none" stroke="var(--color-destructive)" strokeWidth="1.6" />
        <path d={sideLine(calls)} fill="none" stroke="var(--color-success)" strokeWidth="1.6" />
        {rich.map((p) => (
          <circle key={`r${p.strike}${p.iv}`} cx={X(p.strike)} cy={Y(p.iv)} r="3.2" fill="var(--color-warning)" />
        ))}
        {spot >= Math.min(...strikes) && spot <= Math.max(...strikes) ? (
          <>
            <line x1={X(spot)} x2={X(spot)} y1={PAD_Y - 6} y2={H - PAD_Y + 6} stroke="var(--sk-ticker)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={X(spot)} y={PAD_Y - 8} textAnchor="middle" className="fill-[var(--sk-ticker)] font-mono text-dense-micro">
              spot {spot.toFixed(2)}
            </text>
          </>
        ) : null}
        {ticks.map((K) => (
          <text key={`k${K}`} x={X(K)} y={H - 2} textAnchor="middle" className="fill-[var(--sk-mute,#7a8492)] font-mono text-dense-micro">
            {K}
          </text>
        ))}
      </svg>
    </div>
  )
}
