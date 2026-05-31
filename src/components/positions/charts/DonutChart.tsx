import type { DonutSegment } from '@/utils/donutChart'
import { fmtMvAbbrev } from '@/utils/positionsCharts'

const CX = 66
const CY = 66
const R_OUTER = 48
const R_INNER = 30
const R_MID = (R_OUTER + R_INNER) / 2
const RING_STROKE = R_OUTER - R_INNER
const CIRC = 2 * Math.PI * R_MID

export interface DonutChartProps {
  segments: DonutSegment[]
  centerMain?: string
  centerSub?: string
  activeLabel?: string | null
  onSegmentClick?: (label: string | null) => void
  size?: number
}

export function DonutChart({
  segments,
  centerMain,
  centerSub,
  activeLabel,
  onSegmentClick,
  size = 132,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let offset = 0

  const rings =
    total > 0
      ? segments.flatMap((seg) => {
          const len = Math.max(0, (seg.value / total) * CIRC)
          if (len < 0.5) return []
          const isActive = activeLabel === seg.label
          const el = (
            <circle
              key={seg.label}
              cx={CX}
              cy={CY}
              r={R_MID}
              fill="none"
              stroke={seg.color}
              strokeWidth={RING_STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${CIRC}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={activeLabel && !isActive ? 0.35 : 1}
              className={onSegmentClick ? 'cursor-pointer' : undefined}
              onClick={
                onSegmentClick
                  ? (e) => {
                      e.stopPropagation()
                      onSegmentClick(isActive ? null : seg.label)
                    }
                  : undefined
              }
            />
          )
          offset += len
          return [el]
        })
      : []

  return (
    <svg width={size} height={size} viewBox="0 0 132 132" role="img" className="shrink-0">
      <circle
        cx={CX}
        cy={CY}
        r={R_MID}
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE}
        className="opacity-10"
      />
      {rings}
      {centerMain && (
        <text
          x={CX}
          y={centerSub ? CY - 4 : CY + 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontSize={centerSub ? 11 : 10}
          fontWeight={600}
          fontFamily="ui-monospace, monospace"
        >
          {centerMain}
        </text>
      )}
      {centerSub && (
        <text
          x={CX}
          y={CY + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontSize={9}
          className="opacity-60"
          fontFamily="ui-monospace, monospace"
        >
          {centerSub}
        </text>
      )}
      {total === 0 && !centerMain && (
        <text x={CX} y={CY + 3} textAnchor="middle" fill="currentColor" fontSize={9} className="opacity-50">
          No data
        </text>
      )}
    </svg>
  )
}

export function donutCenterFromDenom(
  denom: number,
  mode: 'pct' | 'usd',
  pStock: number,
  pCash: number,
  netLiq: number | null,
  simpleCenterPct: boolean,
): { main: string; sub: string } {
  if (denom <= 0) {
    if (netLiq != null) return { main: fmtMvAbbrev(netLiq), sub: 'Net liq.' }
    return { main: '—', sub: '' }
  }
  if (mode === 'usd') {
    return {
      main: fmtMvAbbrev(denom),
      sub: netLiq != null ? `Net liq. ${fmtMvAbbrev(netLiq)}` : 'Chart basis',
    }
  }
  if (simpleCenterPct) {
    return {
      main: `${(pStock * 100).toFixed(1)} · ${(pCash * 100).toFixed(1)}`,
      sub: '% of sum',
    }
  }
  return {
    main: '100.0%',
    sub: netLiq != null ? `Basis ${fmtMvAbbrev(denom)}` : `Basis ${fmtMvAbbrev(denom)}`,
  }
}
