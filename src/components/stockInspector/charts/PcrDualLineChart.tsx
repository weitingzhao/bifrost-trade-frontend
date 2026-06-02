import { useMemo } from 'react'
import type { SymbolOptionPcrTrendPoint } from '@/types/research'
import { chartAxisTickFill } from '@/lib/chartTokens'
import {
  PCR_CHART_LAYOUT,
  PCR_COLORS,
  buildPcrChartScale,
  parseTradeDayMs,
  xFromTradeDate,
} from './pcrChartUtils'
import styles from '../stock-inspector.module.css'

interface Props {
  points: SymbolOptionPcrTrendPoint[]
  windowDays: number
  asOfDate?: string | null
}

export function PcrDualLineChart({ points, windowDays, asOfDate }: Props) {
  const scale = useMemo(
    () => buildPcrChartScale(points, windowDays, asOfDate),
    [points, windowDays, asOfDate],
  )

  const { oi, vol, yMax } = useMemo(() => {
    const oiPts: { ms: number; v: number }[] = []
    const volPts: { ms: number; v: number }[] = []
    for (const p of points) {
      const ms = parseTradeDayMs(p.trade_date)
      if (ms == null || ms < scale.startMs || ms > scale.endMs) continue
      if (p.oi_ratio != null && Number.isFinite(p.oi_ratio)) oiPts.push({ ms, v: p.oi_ratio })
      if (p.vol_ratio != null && Number.isFinite(p.vol_ratio)) volPts.push({ ms, v: p.vol_ratio })
    }
    oiPts.sort((a, b) => a.ms - b.ms)
    volPts.sort((a, b) => a.ms - b.ms)
    const peak = Math.max(2.58, ...oiPts.map((p) => p.v), ...volPts.map((p) => p.v), 1)
    return { oi: oiPts, vol: volPts, yMax: Math.ceil(peak * 100) / 100 }
  }, [points, scale])

  const { h, vw, pl, pr, pt, pb } = PCR_CHART_LAYOUT.ratio
  const cw = vw - pl - pr
  const ch = h - pt - pb
  const refVal = 1
  const range = yMax || 1

  const xOfMs = (ms: number) => xFromTradeDate(ms, scale, pl, cw)
  const yOf = (v: number) => pt + (1 - v / range) * ch
  const refY = yOf(refVal)
  const yTicks = [0, yMax / 2, yMax]

  const linePts = (pts: { ms: number; v: number }[]) =>
    pts.length >= 2
      ? pts.map((p) => `${xOfMs(p.ms).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
      : pts.length === 1
        ? `${xOfMs(pts[0].ms).toFixed(1)},${yOf(pts[0].v).toFixed(1)}`
        : ''

  if (points.length === 0) {
    return <p className={styles.pcrChartEmpty}>No ratio history in this window.</p>
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
      <rect x={pl} y={pt} width={cw} height={refY - pt} fill="rgba(88, 28, 135, 0.22)" />
      <rect x={pl} y={refY} width={cw} height={pt + ch - refY} fill="rgba(15, 76, 92, 0.28)" />
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
              {tv.toFixed(2)}
            </text>
          </g>
        )
      })}
      <line
        x1={pl}
        y1={refY}
        x2={vw - pr}
        y2={refY}
        stroke="rgba(148, 163, 184, 0.42)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />
      <text x={vw - pr + 2} y={refY + 3} textAnchor="start" fontSize={9} fill={chartAxisTickFill}>
        1.0
      </text>
      {vol.length >= 2 && (
        <polyline
          points={linePts(vol)}
          fill="none"
          stroke={PCR_COLORS.volLine}
          strokeWidth={1.7}
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
      )}
      {vol.length === 1 && (
        <circle cx={xOfMs(vol[0].ms)} cy={yOf(vol[0].v)} r={2.5} fill={PCR_COLORS.volLine} />
      )}
      {oi.length >= 2 && (
        <polyline
          points={linePts(oi)}
          fill="none"
          stroke={PCR_COLORS.oiLine}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {oi.length === 1 && (
        <circle cx={xOfMs(oi[0].ms)} cy={yOf(oi[0].v)} r={2.5} fill={PCR_COLORS.oiLine} />
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
