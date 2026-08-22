/**
 * Scenario fan chart — predicted price bands + actual spot overlay.
 * Pure SVG, no external chart library.
 */

interface FanPoint {
  time: string
  low: number
  high: number
  target: number
}

interface SpotPoint {
  time: string
  price: number
}

interface ScenarioFanChartProps {
  fanPoints: FanPoint[]
  spotPoints?: SpotPoint[]
  width?: number
  height?: number
  className?: string
}

export function ScenarioFanChart({
  fanPoints,
  spotPoints = [],
  width = 600,
  height = 260,
  className,
}: ScenarioFanChartProps) {
  if (fanPoints.length === 0) {
    return (
      <div className={className} style={{ width, height }}>
        <p className="text-dense-meta text-muted-foreground text-center pt-16">
          No forecast data available
        </p>
      </div>
    )
  }

  const pad = { top: 20, right: 40, bottom: 30, left: 60 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom

  const allPrices = [
    ...fanPoints.flatMap((p) => [p.low, p.high, p.target]),
    ...spotPoints.map((p) => p.price),
  ]
  const minP = Math.min(...allPrices)
  const maxP = Math.max(...allPrices)
  const pRange = maxP - minP || 1

  const n = fanPoints.length
  const xScale = (i: number) => pad.left + (i / Math.max(n - 1, 1)) * chartW
  const yScale = (p: number) => pad.top + (1 - (p - minP) / pRange) * chartH

  // Fan area (low→high band)
  const areaTop = fanPoints.map((p, i) => `${xScale(i)},${yScale(p.high)}`).join(' ')
  const areaBot = fanPoints
    .slice()
    .reverse()
    .map((p, i) => `${xScale(n - 1 - i)},${yScale(p.low)}`)
    .join(' ')
  const fanPolygon = `${areaTop} ${areaBot}`

  // Target line
  const targetPath = fanPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(p.target)}`).join(' ')

  // Spot overlay
  let spotPath = ''
  if (spotPoints.length > 1) {
    const spotXStep = chartW / Math.max(spotPoints.length - 1, 1)
    spotPath = spotPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${pad.left + i * spotXStep},${yScale(p.price)}`)
      .join(' ')
  }

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minP + (pRange * i) / 4)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label="Scenario fan chart"
    >
      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            y1={yScale(t)}
            x2={width - pad.right}
            y2={yScale(t)}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
          <text
            x={pad.left - 6}
            y={yScale(t) + 3}
            textAnchor="end"
            fill="var(--muted-foreground)"
            fontSize={10}
          >
            {t.toFixed(0)}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {fanPoints.map((p, i) => (
        <text
          key={p.time}
          x={xScale(i)}
          y={height - 6}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize={9}
        >
          {p.time}
        </text>
      ))}

      {/* Fan area */}
      <polygon points={fanPolygon} fill="var(--color-chart-4, #a78bfa)" opacity={0.15} />

      {/* Target line */}
      <path d={targetPath} fill="none" stroke="var(--color-chart-4, #a78bfa)" strokeWidth={2} strokeDasharray="5,3" />

      {/* Spot overlay */}
      {spotPath && (
        <path d={spotPath} fill="none" stroke="var(--foreground)" strokeWidth={2} />
      )}
    </svg>
  )
}

export default ScenarioFanChart
