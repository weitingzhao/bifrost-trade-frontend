/**
 * Horizontal bar chart for GEX by strike — Positive (green) / Negative (red).
 * Pure SVG, no external chart library.
 */

export interface GexBar {
  strike: number
  call_gex: number
  put_gex: number
  net_gex: number
}

interface GexStrikeChartProps {
  bars: GexBar[]
  spot?: number
  zeroGamma?: number
  callWall?: number
  putWall?: number
  width?: number
  height?: number
  className?: string
}

export function GexStrikeChart({
  bars,
  spot,
  zeroGamma,
  callWall,
  putWall,
  width = 500,
  height = 400,
  className,
}: GexStrikeChartProps) {
  if (bars.length === 0) {
    return (
      <div className={className} style={{ width, height }}>
        <p className="text-dense-meta text-muted-foreground text-center pt-16">
          No GEX data available
        </p>
      </div>
    )
  }

  const pad = { top: 10, right: 20, bottom: 20, left: 60 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const sorted = [...bars].sort((a, b) => a.strike - b.strike)
  const maxAbsGex = Math.max(...sorted.map((b) => Math.abs(b.net_gex)), 1)
  const barH = Math.min(chartH / sorted.length, 12)
  const gapH = Math.max(1, (chartH - barH * sorted.length) / Math.max(sorted.length - 1, 1))
  const midX = pad.left + chartW / 2

  const yOf = (i: number) => pad.top + i * (barH + gapH)
  const wOf = (gex: number) => (Math.abs(gex) / maxAbsGex) * (chartW / 2)

  // Spot horizontal line
  const spotY = spot
    ? (() => {
        const idx = sorted.findIndex((b) => b.strike >= spot)
        if (idx < 0) return null
        return yOf(idx) + barH / 2
      })()
    : null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
      role="img"
      aria-label="GEX by strike"
    >
      {/* Center line */}
      <line x1={midX} y1={pad.top} x2={midX} y2={height - pad.bottom} stroke="var(--border)" strokeWidth={1} />

      {sorted.map((bar, i) => {
        const y = yOf(i)
        const w = wOf(bar.net_gex)
        const isPos = bar.net_gex >= 0
        const x = isPos ? midX : midX - w
        const fill = isPos
          ? 'var(--color-profit, #22c55e)'
          : 'var(--color-loss, #ef4444)'

        return (
          <g key={bar.strike}>
            <rect x={x} y={y} width={w} height={barH} fill={fill} opacity={0.8} rx={1} />
            {/* Strike label (every Nth) */}
            {(i % Math.max(Math.floor(sorted.length / 15), 1) === 0) && (
              <text
                x={pad.left - 4}
                y={y + barH / 2 + 3}
                textAnchor="end"
                fill="var(--muted-foreground)"
                fontSize={9}
              >
                {bar.strike.toFixed(0)}
              </text>
            )}
          </g>
        )
      })}

      {/* Spot line */}
      {spotY != null && (
        <line
          x1={pad.left}
          y1={spotY}
          x2={width - pad.right}
          y2={spotY}
          stroke="var(--foreground)"
          strokeWidth={1.5}
          strokeDasharray="4,2"
        />
      )}

      {/* Key level annotations */}
      {[
        { val: zeroGamma, label: 'ZG', color: 'var(--color-chart-3, #fbbf24)' },
        { val: callWall, label: 'CW', color: 'var(--color-profit, #22c55e)' },
        { val: putWall, label: 'PW', color: 'var(--color-loss, #ef4444)' },
      ]
        .filter((l) => l.val != null)
        .map((level) => {
          const idx = sorted.findIndex((b) => b.strike >= level.val!)
          if (idx < 0) return null
          const ly = yOf(idx) + barH / 2
          return (
            <g key={level.label}>
              <line
                x1={pad.left}
                y1={ly}
                x2={width - pad.right}
                y2={ly}
                stroke={level.color}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <text
                x={width - pad.right + 2}
                y={ly + 3}
                fill={level.color}
                fontSize={9}
                fontWeight={600}
              >
                {level.label}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

export default GexStrikeChart
