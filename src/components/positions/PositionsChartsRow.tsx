import { useMemo } from 'react'
import { fmtUsd } from '@/utils/positions'
import { buildAssetMixSegments, buildSymbolDonutSegments, buildOptionDetailSegments } from '@/utils/donutChart'
import type { DonutSegment } from '@/utils/donutChart'
import type { LivePositionRow } from '@/types/positions'

interface Props {
  stocks: LivePositionRow[]
  options: LivePositionRow[]
  totalCash: number
}

const CX = 56
const CY = 56
const R_OUTER = 48
const R_INNER = 30
const R_MID = (R_OUTER + R_INNER) / 2
const RING_STROKE = R_OUTER - R_INNER
const CIRC = 2 * Math.PI * R_MID

function DonutRing({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel?: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-28">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    )
  }

  let offset = 0
  const circles = segments.map((seg) => {
    const frac = seg.value / total
    const len = Math.max(0, frac) * CIRC
    if (len < 0.5) return null
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
      />
    )
    offset += len
    return el
  })

  return (
    <svg width={112} height={112} viewBox="0 0 112 112" role="img">
      <circle cx={CX} cy={CY} r={R_MID} fill="none" stroke="currentColor" strokeWidth={RING_STROKE} className="opacity-10" />
      {circles}
      {centerLabel && (
        <text x={CX} y={CY + 3} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize={9} fontWeight="600" fontFamily="ui-monospace, monospace">
          {centerLabel}
        </text>
      )}
    </svg>
  )
}

function ChartCard({ title, segments }: { title: string; segments: DonutSegment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="flex items-start gap-4">
        <DonutRing segments={segments} centerLabel={total > 0 ? fmtUsd(total, true) : undefined} />
        <div className="flex-1 space-y-1 pt-1">
          {segments.map((seg) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0'
            return (
              <div key={seg.label} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="flex-1 text-muted-foreground truncate">{seg.label}</span>
                <span className="font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                <span className="font-mono w-16 text-right">{fmtUsd(seg.value, true)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PositionsChartsRow({ stocks, options, totalCash }: Props) {
  const assetMix = useMemo(() => buildAssetMixSegments(stocks, options, totalCash), [stocks, options, totalCash])
  const symbolDetail = useMemo(() => buildSymbolDonutSegments(stocks), [stocks])
  const optionDetail = useMemo(() => buildOptionDetailSegments(options), [options])

  const hasData = assetMix.length > 0 || symbolDetail.length > 0 || optionDetail.length > 0
  if (!hasData) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartCard title="Asset Mix" segments={assetMix} />
      <ChartCard title="Stock by Symbol" segments={symbolDetail.slice(0, 8)} />
      <ChartCard title="Option by Underlying" segments={optionDetail.slice(0, 8)} />
    </div>
  )
}
