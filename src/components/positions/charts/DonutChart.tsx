import type { DonutSegment } from '@/utils/donutChart'
import { COVERAGE_PIE_EMPTY } from '@/utils/positionsCharts'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import styles from './DonutChart.module.css'
import { cn } from '@/lib/utils'

/** Legacy Positions coverage-asset-pie geometry (132×132 viewBox). */
const CX = 66
const CY = 66
const R_MID = 46
const RING_STROKE = 14
const CIRC = 2 * Math.PI * R_MID

export type DonutCenterVariant = 'basis' | 'triplet' | 'netliq'

export interface DonutChartProps {
  segments: DonutSegment[]
  centerMain?: string
  centerSub?: string
  centerVariant?: DonutCenterVariant
  activeLabel?: string | null
  onSegmentClick?: (label: string | null) => void
  size?: number
}

/** Max text width inside the donut hole (viewBox user units). */
const CENTER_INNER_MAX_WIDTH = 70

function centerMainFontSize(variant: DonutCenterVariant, text: string): number {
  if (variant === 'netliq') return 20
  if (variant === 'triplet') return text.length > 12 ? 11 : 12
  if (text.length > 9) return 15
  return 18
}

function centerSubFontSize(sub: string): number {
  if (sub.length > 28) return 9
  if (sub.length > 22) return 10
  return 11
}

export function DonutChart({
  segments,
  centerMain,
  centerSub,
  centerVariant = 'basis',
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
          const isDimmed = activeLabel != null && !isActive
          const el = (
            <circle
              key={seg.label}
              cx={CX}
              cy={CY}
              r={R_MID}
              fill="none"
              stroke={seg.color}
              strokeWidth={isActive ? RING_STROKE + 4 : RING_STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${CIRC}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={isDimmed ? 0.22 : 1}
              className={onSegmentClick ? 'cursor-pointer' : undefined}
              style={{
                transition:
                  'stroke-dasharray 0.36s cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 0.36s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease, stroke-width 0.18s ease',
              }}
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

  const mainClass = cn(
    styles.centerMain,
    centerVariant === 'triplet' && styles.centerMainTriplet,
    centerVariant === 'netliq' && styles.centerMainNetliq,
    centerVariant === 'basis' && styles.centerMainBasis,
  )

  const subLong = (centerSub?.length ?? 0) > 22
  const mainFontSize = centerMain ? centerMainFontSize(centerVariant, centerMain) : 18
  const subFontSize = centerSub ? centerSubFontSize(centerSub) : 11

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 132 132"
      role="img"
      className={cn(styles.svg, 'shrink-0')}
    >
      <circle
        cx={CX}
        cy={CY}
        r={R_MID}
        fill="none"
        stroke={COVERAGE_PIE_EMPTY}
        strokeWidth={RING_STROKE}
        className={styles.ringTrack}
      />
      {rings}
      {centerMain && (
        <text
          x={CX}
          y={centerSub ? CY - 5 : CY + 1}
          className={mainClass}
          fontSize={mainFontSize}
          textAnchor="middle"
          dominantBaseline="middle"
          {...(centerMain.length > 10
            ? { textLength: CENTER_INNER_MAX_WIDTH, lengthAdjust: 'spacingAndGlyphs' as const }
            : {})}
        >
          {centerMain}
        </text>
      )}
      {centerSub && (
        <text
          x={CX}
          y={CY + 12}
          className={cn(styles.centerSub, subLong && styles.centerSubLong)}
          fontSize={subFontSize}
          textAnchor="middle"
          dominantBaseline="middle"
          {...(subLong
            ? { textLength: CENTER_INNER_MAX_WIDTH, lengthAdjust: 'spacingAndGlyphs' as const }
            : {})}
        >
          {centerSub}
        </text>
      )}
      {total === 0 && !centerMain && (
        <text
          x={CX}
          y={CY + 4}
          className={styles.centerEmpty}
          textAnchor="middle"
          dominantBaseline="middle"
        >
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
): { main: string; sub: string; variant: DonutCenterVariant } {
  if (denom <= 0) {
    if (netLiq != null) {
      return { main: fmtMvAbbrev(netLiq), sub: 'Net liq.', variant: 'netliq' }
    }
    return { main: '—', sub: '', variant: 'basis' }
  }
  if (mode === 'usd') {
    return {
      main: fmtMvAbbrev(denom),
      sub: netLiq != null ? `Net liq. ${fmtMvAbbrev(netLiq)}` : 'Chart basis',
      variant: 'basis',
    }
  }
  if (simpleCenterPct) {
    return {
      main: `${(pStock * 100).toFixed(1)} · ${(pCash * 100).toFixed(1)}`,
      sub: '% of sum',
      variant: 'triplet',
    }
  }
  return {
    main: '100.0%',
    sub:
      netLiq != null
        ? `Basis ${fmtMvAbbrev(denom)} · Net liq. ${fmtMvAbbrev(netLiq)}`
        : `Chart basis ${fmtMvAbbrev(denom)}`,
    variant: 'basis',
  }
}
