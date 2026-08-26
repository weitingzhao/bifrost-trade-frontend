/**
 * ATM Vol vs DTE line chart — Wave RS-B-Surface2.
 *
 * Simple SVG line with markers per expiry. Uses tokens (text-dense-*,
 * stroke-primary, stroke-border) — no raw font-size and no PnL palette.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TermStructurePoint } from '@/api/research/volSurface'

interface TermStructureChartProps {
  rows: TermStructurePoint[]
  width?: number
  height?: number
  className?: string
}

export function TermStructureChart({
  rows,
  width = 640,
  height = 200,
  className,
}: TermStructureChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chart = useMemo(() => {
    const points = rows
      .filter((r) => r.dte != null && r.atm_vol != null && Number.isFinite(r.atm_vol))
      .sort((a, b) => (a.dte ?? 0) - (b.dte ?? 0))
    if (points.length === 0) return null
    const pad = { top: 12, right: 16, bottom: 28, left: 44 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const vols = points.map((p) => p.atm_vol as number)
    const dtes = points.map((p) => p.dte as number)
    const minVol = Math.min(...vols, 0)
    const maxVol = Math.max(...vols, minVol + 0.01)
    const maxDte = Math.max(...dtes, 1)
    const yRange = maxVol - minVol || 1
    const xScale = (dte: number) => pad.left + (dte / maxDte) * chartW
    const yScale = (v: number) => pad.top + (1 - (v - minVol) / yRange) * chartH
    const path = points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${xScale(p.dte as number).toFixed(2)},${yScale(p.atm_vol as number).toFixed(2)}`,
      )
      .join(' ')
    return { points, pad, chartW, chartH, minVol, maxVol, xScale, yScale, path }
  }, [rows, width, height])

  if (!chart) {
    return (
      <div
        className={cn(
          className,
          'text-dense-meta text-muted-foreground text-center py-6',
        )}
      >
        No term structure data yet.
      </div>
    )
  }

  const hovered = hoverIdx != null ? chart.points[hoverIdx] : null

  return (
    <div className={cn('relative', className)}>
      <svg
        width={width}
        height={height}
        className="max-w-full"
        role="img"
        aria-label="ATM vol vs DTE term structure"
      >
        <line
          x1={chart.pad.left}
          x2={chart.pad.left + chart.chartW}
          y1={chart.yScale(chart.minVol)}
          y2={chart.yScale(chart.minVol)}
          className="stroke-border"
          strokeWidth={1}
        />

        <path d={chart.path} fill="none" className="stroke-primary" strokeWidth={2} />

        {chart.points.map((p, i) => (
          <g key={p.expiry ?? i}>
            <circle
              cx={chart.xScale(p.dte as number)}
              cy={chart.yScale(p.atm_vol as number)}
              r={hoverIdx === i ? 4.5 : 3}
              className={cn(
                hoverIdx === i ? 'fill-primary' : 'fill-primary/70',
                'stroke-background',
              )}
              strokeWidth={1}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}

        <text
          x={8}
          y={chart.pad.top + 4}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          {(chart.maxVol * 100).toFixed(0)}%
        </text>
        <text
          x={8}
          y={chart.pad.top + chart.chartH - 2}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          {(chart.minVol * 100).toFixed(0)}%
        </text>
        {chart.points.map((p, i) => (
          <text
            key={`x-${i}`}
            x={chart.xScale(p.dte as number)}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-dense-micro font-mono"
          >
            {p.dte}
          </text>
        ))}
      </svg>

      {hovered ? (
        <div className="mt-1 rounded-md border border-border bg-secondary/80 px-3 py-1.5 text-dense-meta">
          <span className="font-mono">{hovered.expiry ?? '—'}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">DTE {hovered.dte}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            ATM {(((hovered.atm_vol ?? 0) as number) * 100).toFixed(1)}%
          </span>
          {hovered.atm_slope != null ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-mono tabular-nums">
                slope {hovered.atm_slope.toFixed(3)}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          ATM implied vol across expiries — steepness reveals term-structure regime.
        </p>
      )}
    </div>
  )
}
