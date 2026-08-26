/**
 * Intraday session timeline — spot line + regime bands (Wave R8).
 * Data source: GET /terrain/intraday only.
 */
import { useMemo, useState } from 'react'
import type { TerrainIntraday } from '@/api/researchEngine'
import { liveScenario } from '@/lib/intradayPlaybook'
import { cn } from '@/lib/utils'

function sparseLabelIndices(count: number): Set<number> {
  if (count <= 8) {
    return new Set(Array.from({ length: count }, (_, i) => i))
  }
  const indices = new Set<number>()
  indices.add(0)
  indices.add(count - 1)
  indices.add(Math.floor(count / 2))
  const step = Math.max(1, Math.floor(count / 4))
  for (let i = step; i < count - 1; i += step) {
    indices.add(i)
  }
  return indices
}

function regimeBandClass(regime: string): string {
  const lo = regime.toLowerCase()
  if (lo.includes('bull')) return 'fill-emerald-500/15'
  if (lo.includes('bear')) return 'fill-red-500/15'
  if (lo.includes('squeeze') || lo.includes('pin')) return 'fill-amber-500/15'
  if (lo.includes('rangy') || lo.includes('range')) return 'fill-violet-500/15'
  return 'fill-muted/30'
}

function formatTime(ts: string): string {
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

interface SessionTimelineChartProps {
  rows: TerrainIntraday[]
  selectedIdx?: number
  onSelectIdx?: (idx: number) => void
  width?: number
  height?: number
  className?: string
}

export function SessionTimelineChart({
  rows,
  selectedIdx,
  onSelectIdx,
  width = 640,
  height = 200,
  className,
}: SessionTimelineChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const effectiveIdx = selectedIdx ?? (rows.length > 0 ? rows.length - 1 : -1)
  const tooltipIdx = hoverIdx ?? (effectiveIdx >= 0 ? effectiveIdx : null)

  const chart = useMemo(() => {
    if (rows.length === 0) return null
    const pad = { top: 16, right: 12, bottom: 28, left: 52 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const spots = rows.map((r) => r.spot)
    const minP = Math.min(...spots)
    const maxP = Math.max(...spots)
    const pRange = maxP - minP || 1
    const n = rows.length
    const xScale = (i: number) => pad.left + (i / Math.max(n - 1, 1)) * chartW
    const yScale = (p: number) => pad.top + (1 - (p - minP) / pRange) * chartH

    const linePath = rows
      .map((r, i) => `${xScale(i)},${yScale(r.spot)}`)
      .join(' ')

    const bands: { x: number; w: number; regime: string }[] = []
    let bandStart = 0
    for (let i = 1; i <= n; i++) {
      const prevRegime = rows[bandStart].regime
      const curRegime = i < n ? rows[i].regime : null
      if (i === n || curRegime !== prevRegime) {
        const endIdx = i === n ? n - 1 : i - 1
        const x0 = xScale(bandStart)
        const x1 = xScale(endIdx)
        bands.push({
          x: x0,
          w: Math.max(x1 - x0, 2),
          regime: prevRegime,
        })
        bandStart = i
      }
    }

    return { pad, chartW, chartH, minP, maxP, pRange, n, xScale, yScale, linePath, bands }
  }, [rows, width, height])

  if (!chart || rows.length === 0) {
    return (
      <div className={cn(className, 'text-dense-meta text-muted-foreground text-center py-8')}>
        No intraday snapshots
      </div>
    )
  }

  const labelIndices = sparseLabelIndices(chart.n)
  const tooltipRow = tooltipIdx != null ? rows[tooltipIdx] : null
  const topScenario = tooltipRow ? liveScenario(tooltipRow) : null
  const topProb =
    tooltipRow && topScenario
      ? topScenario === 'rangy'
        ? tooltipRow.prob_rangy
        : topScenario === 'bull'
          ? tooltipRow.prob_bull
          : topScenario === 'bear'
            ? tooltipRow.prob_bear
            : tooltipRow.prob_squeeze
      : null

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="max-w-full" role="img" aria-label="Session timeline">
        {chart.bands.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={chart.pad.top}
            width={b.w}
            height={chart.chartH}
            className={regimeBandClass(b.regime)}
          />
        ))}

        <polyline
          points={chart.linePath}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2}
        />

        {effectiveIdx >= 0 ? (
          <line
            x1={chart.xScale(effectiveIdx)}
            x2={chart.xScale(effectiveIdx)}
            y1={chart.pad.top}
            y2={chart.pad.top + chart.chartH}
            className="stroke-primary"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ) : null}

        {rows.map((r, i) => (
          <circle
            key={r.asof_ts}
            cx={chart.xScale(i)}
            cy={chart.yScale(r.spot)}
            r={effectiveIdx === i ? 4 : 3}
            className={cn(
              'fill-background stroke-foreground cursor-pointer',
              effectiveIdx === i && 'stroke-primary stroke-2',
            )}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => onSelectIdx?.(i)}
          />
        ))}

        {Array.from(labelIndices).map((i) => (
          <text
            key={i}
            x={chart.xScale(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            {formatTime(rows[i].asof_ts)}
          </text>
        ))}

        <text x={8} y={chart.pad.top + 4} className="fill-muted-foreground text-[10px] font-mono">
          {chart.maxP.toFixed(1)}
        </text>
        <text
          x={8}
          y={chart.pad.top + chart.chartH}
          className="fill-muted-foreground text-[10px] font-mono"
        >
          {chart.minP.toFixed(1)}
        </text>
      </svg>

      {tooltipRow ? (
        <div
          className="mt-2 rounded-md border border-border bg-secondary/80 px-3 py-2 text-dense-meta"
        >
          <span className="font-mono">{formatTime(tooltipRow.asof_ts)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">spot {tooltipRow.spot.toFixed(2)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span>{tooltipRow.regime}</span>
          {topScenario && topProb != null ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span>
                {topScenario} {(topProb * 100).toFixed(0)}%
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
