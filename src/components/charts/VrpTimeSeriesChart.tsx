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
 *
 * Two readers since 2026-09-23. Symbol's volatility face draws it as it always
 * has (RV60, fixed width). History draws the design's "IV vs realized": RV20,
 * a band for where IV has sat, and the width of its panel — so those are
 * props with the old behaviour as their defaults, rather than a second chart
 * of the same two lines (§14.2). History also dashes each earnings print
 * (`marks`), as the design does.
 */
import { fmtPctFromFraction } from '@/lib/format'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VrpRow } from '@/api/research/vrp'

type RealizedKey = 'rv_20d' | 'rv_60d'

const REALIZED_LABEL: Record<RealizedKey, { legend: string; short: string }> = {
  rv_20d: { legend: 'Realized Vol 20d', short: 'RV20' },
  rv_60d: { legend: 'Realized Vol 60d', short: 'RV60' },
}

interface VrpTimeSeriesChartProps {
  rows: VrpRow[]
  width?: number
  height?: number
  className?: string
  /** Which realised series is drawn against IV. */
  realized?: RealizedKey
  /** A shaded range of IV, as fractions — e.g. its 20th–80th percentile. */
  band?: { lo: number; hi: number; label: string } | null
  /** Scale to the container instead of a fixed pixel width. */
  fluid?: boolean
  /**
   * Dashed verticals at dates — History's earnings prints. Each sits on the
   * first row on or after its date; a date outside the rows is left off.
   */
  marks?: ChartMark[]
}

export interface ChartMark {
  date: string
  label: string
  title?: string
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
  realized = 'rv_60d',
  band = null,
  fluid = false,
  marks = [],
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
      const rv = r[realized]
      if (rv != null) values.push(rv)
    })
    if (band) values.push(band.hi)
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
      rvPath: seriesPath((r) => r[realized]),
    }
  }, [rows, width, height, realized, band])

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
  const first = rows[0]?.trade_date ?? ''
  const last = rows[rows.length - 1]?.trade_date ?? ''
  const drawnMarks = marks
    .filter((m) => m.date >= first && m.date <= last)
    .map((m) => ({ ...m, i: rows.findIndex((r) => (r.trade_date ?? '') >= m.date) }))
    .filter((m) => m.i >= 0)
  const tooltipRow = hoverIdx != null ? rows[hoverIdx] : null
  return (
    <div className={cn('relative', className)}>
      <svg
        width={fluid ? '100%' : width}
        height={fluid ? undefined : height}
        viewBox={fluid ? `0 0 ${width} ${height}` : undefined}
        className="max-w-full"
        role="img"
        aria-label="IV vs RV time series"
      >
        {band ? (
          <rect
            x={chart.pad.left}
            width={chart.chartW}
            y={chart.yScale(band.hi)}
            height={Math.max(0, chart.yScale(band.lo) - chart.yScale(band.hi))}
            className="fill-primary/10"
          >
            <title>{band.label}</title>
          </rect>
        ) : null}
        <line
          x1={chart.pad.left}
          x2={chart.pad.left + chart.chartW}
          y1={chart.yScale(0)}
          y2={chart.yScale(0)}
          className="stroke-[var(--sk-line)]"
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

        {drawnMarks.map((m) => (
          <g key={`mark-${m.date}`}>
            <line
              x1={chart.xScale(m.i)}
              x2={chart.xScale(m.i)}
              y1={chart.pad.top}
              y2={chart.pad.top + chart.chartH}
              className="stroke-muted-foreground/50"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text
              x={chart.xScale(m.i)}
              y={chart.pad.top - 5}
              textAnchor="middle"
              className="fill-muted-foreground text-dense-micro font-mono"
            >
              {m.title ? <title>{m.title}</title> : null}
              {m.label}
            </text>
          </g>
        ))}

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
          <span className="text-muted-foreground">{REALIZED_LABEL[realized].legend}</span>
        </span>
        {band ? (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-primary/10" />
            <span className="text-muted-foreground">{band.label}</span>
          </span>
        ) : null}
        {drawnMarks.length > 0 ? (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-0 border-l border-dashed border-muted-foreground" />
            <span className="text-muted-foreground">Earnings (E)</span>
          </span>
        ) : null}
      </div>

      {tooltipRow ? (
        <div className="mt-2 border px-3 py-2 text-dense-meta mat-card">
          <span className="font-mono">{tooltipRow.trade_date ?? '—'}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            IV {fmtPctFromFraction(tooltipRow.atm_iv_30d)}
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono tabular-nums">
            {REALIZED_LABEL[realized].short} {fmtPctFromFraction(tooltipRow[realized])}
          </span>
          {(realized === 'rv_20d' ? tooltipRow.vrp_20d : tooltipRow.vrp_60d) != null ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-mono tabular-nums">
                VRP {fmtPctFromFraction(realized === 'rv_20d' ? tooltipRow.vrp_20d : tooltipRow.vrp_60d)}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
