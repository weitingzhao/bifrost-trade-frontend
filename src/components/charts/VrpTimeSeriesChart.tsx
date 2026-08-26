/**
 * IV vs RV time-series chart — Wave RS-B-VRP2.
 *
 * SVG dual-line chart:
 *   - ATM IV (30d) — primary color
 *   - Realized Vol (60d annualized) — muted color
 * X-axis: trade_date (sparse tick labels)
 * Y-axis: volatility level (0..max) with two anchor labels
 *
 * Uses Tailwind + tokenized text-dense-* / text-primary / text-muted-foreground
 * (no `text-[Npx]`, no raw emerald/red). Follows the pattern established by
 * SessionTimelineChart but scoped for a daily VRP view.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VrpRow } from '@/api/research/vrp'

interface VrpTimeSeriesChartProps {
  rows: VrpRow[]
  width?: number
  height?: number
  className?: string
}

function sparseLabelIndices(count: number, target = 6): Set<number> {
  if (count <= target) return new Set(Array.from({ length: count }, (_, i) => i))
  const indices = new Set<number>()
  const step = Math.max(1, Math.floor(count / target))
  for (let i = 0; i < count; i += step) indices.add(i)
  indices.add(0)
  indices.add(count - 1)
  return indices
}

export function VrpTimeSeriesChart({
  rows,
  width = 640,
  height = 220,
  className,
}: VrpTimeSeriesChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chart = useMemo(() => {
    if (rows.length === 0) return null
    const pad = { top: 16, right: 12, bottom: 28, left: 44 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const values: number[] = []
    rows.forEach((r) => {
      if (r.atm_iv_30d != null) values.push(r.atm_iv_30d)
      if (r.rv_60d != null) values.push(r.rv_60d)
    })
    if (values.length === 0) return null
    const maxV = Math.max(...values)
    const minV = 0
    const yRange = maxV - minV || 1
    const n = rows.length
    const xScale = (i: number) => pad.left + (i / Math.max(n - 1, 1)) * chartW
    const yScale = (v: number) => pad.top + (1 - (v - minV) / yRange) * chartH

    function seriesPath(get: (r: VrpRow) => number | null): string {
      const parts: string[] = []
      let started = false
      rows.forEach((r, i) => {
        const v = get(r)
        if (v == null) {
          started = false
          return
        }
        parts.push(`${started ? 'L' : 'M'}${xScale(i).toFixed(2)},${yScale(v).toFixed(2)}`)
        started = true
      })
      return parts.join(' ')
    }

    return {
      pad,
      chartW,
      chartH,
      minV,
      maxV,
      n,
      xScale,
      yScale,
      ivPath: seriesPath((r) => r.atm_iv_30d),
      rvPath: seriesPath((r) => r.rv_60d),
    }
  }, [rows, width, height])

  if (!chart || rows.length === 0) {
    return (
      <div
        className={cn(
          className,
          'text-dense-meta text-muted-foreground text-center py-8',
        )}
      >
        No VRP history yet.
      </div>
    )
  }

  const labelIndices = sparseLabelIndices(chart.n)
  const tooltipRow = hoverIdx != null ? rows[hoverIdx] : null
  const fmtPct = (v: number | null | undefined) =>
    v == null ? '—' : `${(v * 100).toFixed(1)}%`

  return (
    <div className={cn('relative', className)}>
      <svg
        width={width}
        height={height}
        className="max-w-full"
        role="img"
        aria-label="IV vs RV time series"
      >
        <line
          x1={chart.pad.left}
          x2={chart.pad.left + chart.chartW}
          y1={chart.yScale(0)}
          y2={chart.yScale(0)}
          className="stroke-border"
          strokeWidth={1}
        />

        <path
          d={chart.rvPath}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <path
          d={chart.ivPath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
        />

        {rows.map((r, i) => (
          <rect
            key={r.trade_date ?? i}
            x={chart.xScale(i) - 4}
            y={chart.pad.top}
            width={8}
            height={chart.chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}

        {Array.from(labelIndices).map((i) => (
          <text
            key={`x-${i}`}
            x={chart.xScale(i)}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-dense-micro font-mono"
          >
            {(rows[i]?.trade_date ?? '').slice(5)}
          </text>
        ))}

        <text
          x={8}
          y={chart.pad.top + 4}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          {(chart.maxV * 100).toFixed(0)}%
        </text>
        <text
          x={8}
          y={chart.pad.top + chart.chartH - 2}
          className="fill-muted-foreground text-dense-micro font-mono"
        >
          0%
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-dense-meta">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-4 rounded bg-primary" />
          <span className="text-foreground">ATM IV 30d</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-4 rounded bg-muted-foreground" />
          <span className="text-muted-foreground">Realized Vol 60d</span>
        </span>
      </div>

      {tooltipRow ? (
        <div className="mt-2 rounded-md border border-border bg-secondary/80 px-3 py-2 text-dense-meta">
          <span className="font-mono">{tooltipRow.trade_date ?? '—'}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            IV {fmtPct(tooltipRow.atm_iv_30d)}
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            RV60 {fmtPct(tooltipRow.rv_60d)}
          </span>
          {tooltipRow.vrp_60d != null ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-mono tabular-nums">
                VRP {fmtPct(tooltipRow.vrp_60d)}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
