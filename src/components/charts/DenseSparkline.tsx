/**
 * Compact SVG sparkline for Analyze gauge / progress strips.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface DenseSparklineProps {
  values: Array<number | null | undefined>
  width?: number
  height?: number
  className?: string
  strokeClassName?: string
}

export function DenseSparkline({
  values,
  width = 72,
  height = 18,
  className,
  strokeClassName = 'stroke-primary',
}: DenseSparklineProps) {
  const path = useMemo(() => {
    const pts = values
      .map((v, i) => ({ i, v: v != null && Number.isFinite(v) ? Number(v) : null }))
      .filter((p): p is { i: number; v: number } => p.v != null)
    if (pts.length < 2) return null
    const ys = pts.map((p) => p.v)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const yRange = maxY - minY || 1
    const n = values.length
    const xScale = (i: number) => (i / Math.max(n - 1, 1)) * (width - 2) + 1
    const yScale = (v: number) => height - 1 - ((v - minY) / yRange) * (height - 2)
    return pts
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${xScale(p.i).toFixed(1)},${yScale(p.v).toFixed(1)}`)
      .join(' ')
  }, [values, width, height])

  if (!path) {
    return (
      <span className={cn('inline-block text-dense-micro text-muted-foreground', className)}>—</span>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('inline-block shrink-0', className)}
      aria-hidden
    >
      <path d={path} fill="none" className={strokeClassName} strokeWidth={1.25} />
    </svg>
  )
}
