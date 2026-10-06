/**
 * Pine library › Check: the last 60 sessions of one symbol as a small candle
 * chart with the dry run's buy ▲ / sell ▼ drawn on it (design Rev .158 B5,
 * the same marks as Symbol › Price B1): ink, never the P&L colours — a signal
 * is a claim, not a result — ▲ 4px under the low, ▼ 4px over the high, and no
 * svg text; the marks are an HTML layer over a fixed-height svg.
 */
import type { IndicatorBar } from '@/api/research/indicators'
import type { PineSide } from '@/api/research/pine'

const H = 120
const PAD = 12
const MARK_GAP = 4
const MARK_PX = 10

export interface CheckMark {
  date: string
  side: PineSide
  close: number | null
}

export function PineCheckChart({ bars, marks }: { bars: readonly IndicatorBar[]; marks: readonly CheckMark[] }) {
  const seg = bars.filter((b) => b.open != null && b.high != null && b.low != null).slice(-60)
  if (seg.length < 2) return null
  const hi = Math.max(...seg.map((b) => b.high as number))
  const lo = Math.min(...seg.map((b) => b.low as number))
  const span = hi - lo || 1
  const Y = (v: number) => PAD + ((hi - v) / span) * (H - 2 * PAD)
  const n = seg.length
  const xw = 600 / n
  let wicks = ''
  let up = ''
  let dn = ''
  seg.forEach((b, i) => {
    const o = b.open as number
    const c = b.close
    const x = (i + 0.5) * xw
    wicks += `M${x.toFixed(1)} ${Y(b.high as number).toFixed(1)}L${x.toFixed(1)} ${Y(b.low as number).toFixed(1)}`
    const top = Y(Math.max(o, c))
    const body = `M${(x - xw * 0.3).toFixed(1)} ${top.toFixed(1)}h${(xw * 0.6).toFixed(1)}v${Math.max(1, Math.abs(Y(o) - Y(c))).toFixed(1)}h${(-xw * 0.6).toFixed(1)}z`
    if (c >= o) up += body
    else dn += body
  })
  const at = new Map(seg.map((b, i) => [b.date.slice(0, 10), i]))
  const placed = marks
    .map((m) => ({ m, i: at.get(m.date.slice(0, 10)) }))
    .filter((x): x is { m: CheckMark; i: number } => x.i != null)
  return (
    <div className="relative" style={{ height: H }} role="img" aria-label={`Last ${n} sessions with ${placed.length} marks`}>
      <svg viewBox={`0 0 600 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={wicks} stroke="var(--sk-mute)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
        <path d={up} fill="var(--color-profit)" />
        <path d={dn} fill="var(--color-loss)" />
      </svg>
      {placed.map(({ m, i }) => {
        const b = seg[i]
        const y = m.side === 'buy' ? Y(b.low as number) + MARK_GAP : Y(b.high as number) - MARK_GAP - MARK_PX
        return (
          <span
            key={`${m.date}-${m.side}`}
            title={`${m.date.slice(0, 10)} · ${m.side} · close ${b.close.toFixed(2)}`}
            className="absolute -translate-x-1/2 text-dense-caption leading-[10px] text-foreground [text-shadow:0_0_1.5px_var(--background),0_0_1.5px_var(--background)]"
            style={{ left: `${(((i + 0.5) / n) * 100).toFixed(2)}%`, top: y }}
          >
            {m.side === 'buy' ? '▲' : '▼'}
          </span>
        )
      })}
    </div>
  )
}
