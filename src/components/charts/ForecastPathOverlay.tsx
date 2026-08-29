/**
 * Forecast path overlay — predicted band vs realized hourly close.
 * Analyze Wave F.3.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ForecastPathHourly {
  hour_et: number
  level_low?: number | null
  level_high?: number | null
  level_target?: number | null
}

export interface ForecastRealizedHourly {
  hour_et: number
  close: number
}

interface ForecastPathOverlayProps {
  forecast: ForecastPathHourly[]
  realized?: ForecastRealizedHourly[] | null
  width?: number
  height?: number
  className?: string
}

function num(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ForecastPathOverlay({
  forecast,
  realized,
  width = 640,
  height = 200,
  className,
}: ForecastPathOverlayProps) {
  const [hover, setHover] = useState<number | null>(null)

  const chart = useMemo(() => {
    const hours = forecast
      .map((h) => ({
        hour_et: Number(h.hour_et),
        low: num(h.level_low),
        high: num(h.level_high),
        target: num(h.level_target),
        realized: null as number | null,
      }))
      .filter((h) => Number.isFinite(h.hour_et))
      .sort((a, b) => a.hour_et - b.hour_et)

    if (!hours.length) return null

    const realizedByHour = new Map<number, number>()
    for (const r of realized ?? []) {
      const c = num(r.close)
      if (c != null) realizedByHour.set(Number(r.hour_et), c)
    }
    for (const h of hours) {
      h.realized = realizedByHour.get(h.hour_et) ?? null
    }

    const ys = hours.flatMap((h) =>
      [h.low, h.high, h.target, h.realized].filter((v): v is number => v != null),
    )
    if (!ys.length) return null

    const pad = { top: 12, right: 16, bottom: 28, left: 48 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const yPad = (yMax - yMin) * 0.08 || 1
    const y0 = yMin - yPad
    const y1 = yMax + yPad

    const xAt = (i: number) =>
      pad.left + (hours.length === 1 ? chartW / 2 : (i / (hours.length - 1)) * chartW)
    const yAt = (v: number) => pad.top + ((y1 - v) / (y1 - y0)) * chartH

    const bandPts: string[] = []
    hours.forEach((h, i) => {
      if (h.high != null) bandPts.push(`${xAt(i)},${yAt(h.high)}`)
    })
    for (let i = hours.length - 1; i >= 0; i -= 1) {
      const h = hours[i]
      if (h.low != null) bandPts.push(`${xAt(i)},${yAt(h.low)}`)
    }

    const targetPath = hours
      .map((h, i) => (h.target != null ? `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(h.target)}` : null))
      .filter(Boolean)
      .join(' ')

    const realizedPath = hours
      .map((h, i) =>
        h.realized != null ? `${i === 0 || hours.slice(0, i).every((p) => p.realized == null) ? 'M' : 'L'}${xAt(i)},${yAt(h.realized)}` : null,
      )
      .filter(Boolean)
      .join(' ')

    return { hours, bandPts, targetPath, realizedPath, xAt, yAt, y0, y1, pad }
  }, [forecast, realized, width, height])

  if (!chart) {
    return (
      <p className={cn('text-dense-meta text-muted-foreground py-2', className)}>
        No hourly path to overlay.
      </p>
    )
  }

  const hoverRow = hover != null ? chart.hours[hover] : null
  const inBand =
    hoverRow?.realized != null &&
    hoverRow.low != null &&
    hoverRow.high != null &&
    hoverRow.realized >= hoverRow.low &&
    hoverRow.realized <= hoverRow.high

  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full" role="img">
        <title>Forecast path vs realized</title>
        {chart.bandPts.length >= 4 ? (
          <polygon
            points={chart.bandPts.join(' ')}
            className="fill-primary/15"
          />
        ) : null}
        {chart.targetPath ? (
          <path d={chart.targetPath} fill="none" className="stroke-primary" strokeWidth={1.5} />
        ) : null}
        {chart.realizedPath ? (
          <path
            d={chart.realizedPath}
            fill="none"
            className="stroke-destructive"
            strokeWidth={1.75}
          />
        ) : null}
        {chart.hours.map((h, i) => (
          <circle
            key={h.hour_et}
            cx={chart.xAt(i)}
            cy={chart.yAt(h.realized ?? h.target ?? (h.low ?? 0))}
            r={hover === i ? 3.5 : 2.5}
            className={cn(
              h.realized != null ? 'fill-destructive' : 'fill-primary/70',
              'cursor-pointer',
            )}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {chart.hours.map((h, i) => (
          <text
            key={`t-${h.hour_et}`}
            x={chart.xAt(i)}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9 }}
          >
            {h.hour_et}
          </text>
        ))}
      </svg>
      <p className="text-dense-micro text-muted-foreground mt-1">
        Band = forecast [low, high] · line = target · red = realized
        {hoverRow
          ? ` · ${hoverRow.hour_et}:00 ET target ${hoverRow.target?.toFixed(2) ?? '—'} realized ${hoverRow.realized?.toFixed(2) ?? '—'} ${
              hoverRow.realized == null ? '' : inBand ? '(in band)' : '(outside)'
            }`
          : ''}
      </p>
    </div>
  )
}
