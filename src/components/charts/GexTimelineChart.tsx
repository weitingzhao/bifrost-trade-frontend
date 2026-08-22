/**
 * GEX timeline — spot line + stepped Call / Zero-γ / Put walls over asof_ts.
 * Pure SVG (same layer as GexStrikeChart).
 */
import type { GexIntraday } from '@/api/researchEngine'

interface GexTimelineChartProps {
  rows: GexIntraday[]
  width?: number
  height?: number
  className?: string
}

function toMs(ts: string): number {
  const t = Date.parse(ts)
  return Number.isFinite(t) ? t : 0
}

export function GexTimelineChart({
  rows,
  width = 720,
  height = 280,
  className,
}: GexTimelineChartProps) {
  if (rows.length === 0) {
    return (
      <div className={className} style={{ width: '100%', height }}>
        <p className="pt-16 text-center text-dense-meta text-muted-foreground">
          No GEX timeline snapshots
        </p>
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) => toMs(a.asof_ts) - toMs(b.asof_ts))
  const pad = { top: 16, right: 16, bottom: 28, left: 52 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const prices: number[] = []
  for (const r of sorted) {
    for (const v of [r.spot, r.major_call_wall, r.zero_gamma, r.major_put_wall]) {
      if (Number.isFinite(v)) prices.push(v)
    }
  }
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const span = Math.max(maxP - minP, 1)
  const yPad = span * 0.08
  const yLo = minP - yPad
  const yHi = maxP + yPad
  const yRange = yHi - yLo || 1

  const t0 = toMs(sorted[0].asof_ts)
  const t1 = toMs(sorted[sorted.length - 1].asof_ts)
  const tSpan = Math.max(t1 - t0, 1)

  const xOf = (ts: string) => pad.left + ((toMs(ts) - t0) / tSpan) * chartW
  const yOf = (p: number) => pad.top + ((yHi - p) / yRange) * chartH

  const spotPts = sorted
    .map((r) => `${xOf(r.asof_ts).toFixed(1)},${yOf(r.spot).toFixed(1)}`)
    .join(' ')

  function stepPath(key: 'major_call_wall' | 'zero_gamma' | 'major_put_wall'): string {
    if (sorted.length === 0) return ''
    const parts: string[] = []
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i]
      const x = xOf(r.asof_ts)
      const y = yOf(r[key])
      if (i === 0) {
        parts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`)
      } else {
        const prevY = yOf(sorted[i - 1][key])
        parts.push(`L ${x.toFixed(1)} ${prevY.toFixed(1)}`)
        parts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`)
      }
    }
    // extend last step to chart end
    const last = sorted[sorted.length - 1]
    const xEnd = pad.left + chartW
    parts.push(`L ${xEnd.toFixed(1)} ${yOf(last[key]).toFixed(1)}`)
    return parts.join(' ')
  }

  const yTicks = 4
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => yLo + (span + 2 * yPad) * (i / yTicks))

  const timeLabels =
    sorted.length <= 6
      ? sorted
      : [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]]

  function fmtTime(ts: string): string {
    try {
      return new Date(ts).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return ts.slice(11, 16)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label="GEX timeline — spot and walls"
    >
      {/* frame */}
      <rect
        x={pad.left}
        y={pad.top}
        width={chartW}
        height={chartH}
        fill="transparent"
        stroke="var(--border)"
        strokeWidth={1}
      />

      {tickVals.map((v, i) => {
        const y = yOf(v)
        return (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y}
              x2={pad.left + chartW}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.6}
            />
            <text
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="var(--muted-foreground)"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* Call / Zero-γ / Put step lines */}
      <path d={stepPath('major_call_wall')} fill="none" stroke="var(--color-profit, #22c55e)" strokeWidth={1.5} />
      <path d={stepPath('zero_gamma')} fill="none" stroke="var(--color-warning, #f59e0b)" strokeWidth={1.5} />
      <path d={stepPath('major_put_wall')} fill="none" stroke="var(--color-loss, #ef4444)" strokeWidth={1.5} />

      {/* Spot polyline */}
      <polyline
        points={spotPts}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {sorted.map((r) => (
        <circle
          key={r.asof_ts}
          cx={xOf(r.asof_ts)}
          cy={yOf(r.spot)}
          r={2.5}
          fill="var(--foreground)"
        />
      ))}

      {timeLabels.map((r) => (
        <text
          key={`t-${r.asof_ts}`}
          x={xOf(r.asof_ts)}
          y={height - 8}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {fmtTime(r.asof_ts)}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${pad.left + 4}, ${pad.top + 10})`}>
        <LegendDot color="var(--foreground)" label="Spot" x={0} />
        <LegendDot color="var(--color-profit, #22c55e)" label="Call" x={55} />
        <LegendDot color="var(--color-warning, #f59e0b)" label="Zero-γ" x={105} />
        <LegendDot color="var(--color-loss, #ef4444)" label="Put" x={170} />
      </g>
    </svg>
  )
}

function LegendDot({ color, label, x }: { color: string; label: string; x: number }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx={0} cy={-3} r={3} fill={color} />
      <text x={8} y={0} fill="var(--muted-foreground)" fontSize={9}>
        {label}
      </text>
    </g>
  )
}

export default GexTimelineChart
