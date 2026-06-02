import { useMemo } from 'react'
import type { SymbolOptionPcrTrendPoint } from '@/types/research'
import { chartAxisTickFill } from '@/lib/chartTokens'
import {
  PCR_CHART_LAYOUT,
  PCR_COLORS,
  buildPcrChartScale,
  fmtOiAxis,
  niceOiAxisMax,
  parseTradeDayMs,
  xFromTradeDate,
} from './pcrChartUtils'
import styles from '../stock-inspector.module.css'

interface Props {
  points: SymbolOptionPcrTrendPoint[]
  windowDays: number
  asOfDate?: string | null
}

export function OpenInterestTrendChart({ points, windowDays, asOfDate }: Props) {
  const scale = useMemo(
    () => buildPcrChartScale(points, windowDays, asOfDate),
    [points, windowDays, asOfDate],
  )

  const series = useMemo(() => {
    const put: { ms: number; v: number }[] = []
    const call: { ms: number; v: number }[] = []
    for (const p of points) {
      const ms = parseTradeDayMs(p.trade_date)
      if (ms == null || ms < scale.startMs || ms > scale.endMs) continue
      put.push({ ms, v: p.put_oi })
      call.push({ ms, v: p.call_oi })
    }
    put.sort((a, b) => a.ms - b.ms)
    call.sort((a, b) => a.ms - b.ms)
    const rawMax = Math.max(...put.map((p) => p.v), ...call.map((p) => p.v), 1)
    return { put, call, yMax: niceOiAxisMax(rawMax) }
  }, [points, scale])

  const { h, vw, pl, pr, pt, pb } = PCR_CHART_LAYOUT.oi
  const cw = vw - pl - pr
  const ch = h - pt - pb
  const { put, call, yMax } = series
  const xOfMs = (ms: number) => xFromTradeDate(ms, scale, pl, cw)
  const yOf = (v: number) => pt + ch - (v / yMax) * ch
  const yTicks = [0, yMax / 2, yMax]

  const linePts = (pts: { ms: number; v: number }[]) =>
    pts.map((p) => `${xOfMs(p.ms).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')

  if (points.length === 0) {
    return <p className={styles.pcrChartEmpty}>No OI history in this window.</p>
  }

  return (
    <svg
      viewBox={`0 0 ${vw} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className={styles.pcrChart}
      aria-hidden
    >
      <rect x={pl} y={pt} width={cw} height={ch} fill="rgba(0, 0, 0, 0.2)" rx={2} />
      {yTicks.map((tv) => {
        const ty = yOf(tv)
        return (
          <g key={tv}>
            <line
              x1={pl}
              y1={ty}
              x2={vw - pr}
              y2={ty}
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth={0.6}
            />
            <text x={pl - 5} y={ty + 3} textAnchor="end" fontSize={9} fill={chartAxisTickFill}>
              {fmtOiAxis(tv)}
            </text>
          </g>
        )
      })}
      {put.length >= 2 && (
        <polyline
          points={linePts(put)}
          fill="none"
          stroke={PCR_COLORS.putOi}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}
      {call.length >= 2 && (
        <polyline
          points={linePts(call)}
          fill="none"
          stroke={PCR_COLORS.callOi}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}
      {put.length === 1 && (
        <circle cx={xOfMs(put[0].ms)} cy={yOf(put[0].v)} r={2.5} fill={PCR_COLORS.putOi} />
      )}
      {call.length === 1 && (
        <circle cx={xOfMs(call[0].ms)} cy={yOf(call[0].v)} r={2.5} fill={PCR_COLORS.callOi} />
      )}
      {scale.ticks.map((t) => (
        <text
          key={t.ms}
          x={xFromTradeDate(t.ms, scale, pl, cw)}
          y={h - 5}
          textAnchor="middle"
          fontSize={8}
          fill={chartAxisTickFill}
        >
          {t.label}
        </text>
      ))}
    </svg>
  )
}
