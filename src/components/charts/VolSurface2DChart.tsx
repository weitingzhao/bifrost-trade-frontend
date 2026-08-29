/**
 * Per-expiry SVI smile — log-moneyness vs IV (market dots + fitted line).
 * Wave B.1 Analyze enhance.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VolSurfaceResidualRow } from '@/api/research/volSurface'

interface VolSurface2DChartProps {
  rows: VolSurfaceResidualRow[]
  width?: number
  height?: number
  className?: string
}

export function VolSurface2DChart({
  rows,
  width = 640,
  height = 220,
  className,
}: VolSurface2DChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chart = useMemo(() => {
    const pts = rows
      .filter(
        (r) =>
          r.log_moneyness != null &&
          Number.isFinite(r.log_moneyness) &&
          ((r.iv_market != null && Number.isFinite(r.iv_market)) ||
            (r.iv_fitted != null && Number.isFinite(r.iv_fitted))),
      )
      .sort((a, b) => (a.log_moneyness as number) - (b.log_moneyness as number))
    if (pts.length === 0) return null

    const pad = { top: 14, right: 16, bottom: 28, left: 44 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const xs = pts.map((p) => p.log_moneyness as number)
    const ys = pts.flatMap((p) => {
      const out: number[] = []
      if (p.iv_market != null) out.push(p.iv_market)
      if (p.iv_fitted != null) out.push(p.iv_fitted)
      return out
    })
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, minY + 0.01)
    const xRange = maxX - minX || 1
    const yRange = maxY - minY || 1
    const xScale = (x: number) => pad.left + ((x - minX) / xRange) * chartW
    const yScale = (y: number) => pad.top + (1 - (y - minY) / yRange) * chartH

    const fitPath = pts
      .filter((p) => p.iv_fitted != null)
      .map((p, i) => {
        const cmd = i === 0 ? 'M' : 'L'
        return `${cmd}${xScale(p.log_moneyness as number).toFixed(2)},${yScale(p.iv_fitted as number).toFixed(2)}`
      })
      .join(' ')

    return { pts, pad, chartW, chartH, minX, maxX, minY, maxY, xScale, yScale, fitPath }
  }, [rows, width, height])

  if (!chart) {
    return (
      <div className={cn(className, 'py-6 text-center text-dense-meta text-muted-foreground')}>
        No smile points for this expiry yet.
      </div>
    )
  }

  const hover = hoverIdx != null ? chart.pts[hoverIdx] : null

  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full" role="img">
        <line
          x1={chart.pad.left}
          x2={width - chart.pad.right}
          y1={chart.yScale(0)}
          y2={chart.yScale(0)}
          className="stroke-border"
          strokeWidth={1}
        />
        <path d={chart.fitPath} fill="none" className="stroke-primary" strokeWidth={1.5} />
        {chart.pts.map((p, i) => {
          if (p.iv_market == null) return null
          const cx = chart.xScale(p.log_moneyness as number)
          const cy = chart.yScale(p.iv_market)
          return (
            <circle
              key={`${p.strike}-${i}`}
              cx={cx}
              cy={cy}
              r={hoverIdx === i ? 3.5 : 2.5}
              className={hoverIdx === i ? 'fill-foreground' : 'fill-muted-foreground'}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          )
        })}
        <text x={chart.pad.left} y={12} className="fill-muted-foreground text-dense-micro">
          IV
        </text>
        <text
          x={width / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-muted-foreground text-dense-micro"
        >
          log-moneyness
        </text>
        <text
          x={chart.pad.left}
          y={height - 8}
          className="fill-muted-foreground font-mono text-dense-micro"
        >
          {chart.minX.toFixed(2)}
        </text>
        <text
          x={width - chart.pad.right}
          y={height - 8}
          textAnchor="end"
          className="fill-muted-foreground font-mono text-dense-micro"
        >
          {chart.maxX.toFixed(2)}
        </text>
      </svg>
      {hover ? (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          K <span className="font-mono">{hover.strike ?? '—'}</span> · k{' '}
          <span className="font-mono">{(hover.log_moneyness ?? 0).toFixed(3)}</span> · mkt{' '}
          <span className="font-mono">
            {hover.iv_market != null ? `${(hover.iv_market * 100).toFixed(1)}%` : '—'}
          </span>{' '}
          · fit{' '}
          <span className="font-mono">
            {hover.iv_fitted != null ? `${(hover.iv_fitted * 100).toFixed(1)}%` : '—'}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          Dots = market IV · line = SVI fit
        </p>
      )}
    </div>
  )
}
