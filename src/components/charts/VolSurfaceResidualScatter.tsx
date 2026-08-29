/**
 * Per-strike residual scatter — log-moneyness vs residual / residual_z.
 * Wave B.1 Analyze enhance.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VolSurfaceResidualRow } from '@/api/research/volSurface'

interface VolSurfaceResidualScatterProps {
  rows: VolSurfaceResidualRow[]
  mode?: 'residual' | 'residual_z'
  width?: number
  height?: number
  className?: string
}

export function VolSurfaceResidualScatter({
  rows,
  mode = 'residual_z',
  width = 640,
  height = 180,
  className,
}: VolSurfaceResidualScatterProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const chart = useMemo(() => {
    const pts = rows
      .filter((r) => {
        const y = mode === 'residual_z' ? r.residual_z : r.residual
        return (
          r.log_moneyness != null &&
          Number.isFinite(r.log_moneyness) &&
          y != null &&
          Number.isFinite(y)
        )
      })
      .sort((a, b) => (a.log_moneyness as number) - (b.log_moneyness as number))
    if (pts.length === 0) return null

    const pad = { top: 12, right: 16, bottom: 28, left: 44 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const xs = pts.map((p) => p.log_moneyness as number)
    const ys = pts.map((p) => (mode === 'residual_z' ? p.residual_z : p.residual) as number)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const absMaxY = Math.max(...ys.map((v) => Math.abs(v)), 0.01)
    const xRange = maxX - minX || 1
    const xScale = (x: number) => pad.left + ((x - minX) / xRange) * chartW
    const yScale = (y: number) => pad.top + (1 - (y + absMaxY) / (2 * absMaxY)) * chartH
    const zeroY = yScale(0)

    return { pts, pad, chartW, chartH, minX, maxX, absMaxY, xScale, yScale, zeroY }
  }, [rows, mode, width, height])

  if (!chart) {
    return (
      <div className={cn(className, 'py-6 text-center text-dense-meta text-muted-foreground')}>
        No residuals for this expiry yet.
      </div>
    )
  }

  const hover = hoverIdx != null ? chart.pts[hoverIdx] : null
  const yVal = (p: VolSurfaceResidualRow) =>
    (mode === 'residual_z' ? p.residual_z : p.residual) as number

  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full" role="img">
        <line
          x1={chart.pad.left}
          x2={width - chart.pad.right}
          y1={chart.zeroY}
          y2={chart.zeroY}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {chart.pts.map((p, i) => {
          const y = yVal(p)
          const abs = Math.abs(y)
          const fill =
            abs >= 2.5
              ? 'fill-destructive'
              : abs >= 1.5
                ? 'fill-warning'
                : 'fill-primary'
          return (
            <circle
              key={`${p.strike}-${i}`}
              cx={chart.xScale(p.log_moneyness as number)}
              cy={chart.yScale(y)}
              r={hoverIdx === i ? 3.5 : 2.5}
              className={fill}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          )
        })}
        <text x={chart.pad.left} y={12} className="fill-muted-foreground text-dense-micro">
          {mode === 'residual_z' ? 'z' : 'resid'}
        </text>
      </svg>
      {hover ? (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          K <span className="font-mono">{hover.strike ?? '—'}</span> ·{' '}
          {mode === 'residual_z' ? 'z' : 'resid'}{' '}
          <span className="font-mono">{yVal(hover).toFixed(3)}</span>
        </p>
      ) : (
        <p className="mt-1 text-dense-caption text-muted-foreground">
          Hotter color = larger |{mode === 'residual_z' ? 'z' : 'residual'}|
        </p>
      )}
    </div>
  )
}
