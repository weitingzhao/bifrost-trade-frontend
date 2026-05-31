import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import { buildAssetMixSegments, buildSymbolDonutSegments, buildOptionDetailSegments } from '@/utils/donutChart'
import type { DonutSegment } from '@/utils/donutChart'
import type { LivePositionRow } from '@/types/positions'

interface Props {
  stocks: LivePositionRow[]
  options: LivePositionRow[]
  totalCash: number
  onSymbolClick?: (symbol: string | null) => void
  onOptionClick?: (symbol: string | null) => void
  onCategoryClick?: (category: 'stocks' | 'fixed_income' | 'cash_like') => void
  activeSymbol?: string
}

const CX = 56
const CY = 56
const R_OUTER = 48
const R_INNER = 30
const R_MID = (R_OUTER + R_INNER) / 2
const RING_STROKE = R_OUTER - R_INNER
const CIRC = 2 * Math.PI * R_MID

type LegendMode = 'pct' | 'usd'

function DonutRing({
  segments,
  centerLabel,
  activeLabel,
  onSegmentClick,
}: {
  segments: DonutSegment[]
  centerLabel?: string
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-28">
        <p className="text-xs text-muted-foreground">No data</p>
      </div>
    )
  }

  const circles = segments.reduce<{ els: React.ReactNode[]; off: number }>(
    ({ els, off }, seg) => {
      const len = Math.max(0, seg.value / total) * CIRC
      if (len < 0.5) return { els, off: off + len }
      const isActive = activeLabel === seg.label
      return {
        els: [
          ...els,
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
            strokeDashoffset={-off}
            transform={`rotate(-90 ${CX} ${CY})`}
            opacity={activeLabel && !isActive ? 0.35 : 1}
            className={onSegmentClick ? 'cursor-pointer' : ''}
            onClick={onSegmentClick ? (e) => { e.stopPropagation(); onSegmentClick(seg.label) } : undefined}
          />,
        ],
        off: off + len,
      }
    },
    { els: [], off: 0 },
  ).els

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

function ChartCard({
  title,
  segments,
  legendMode,
  activeLabel,
  onSegmentClick,
  headerRight,
}: {
  title: string
  segments: DonutSegment[]
  legendMode: LegendMode
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
  headerRight?: React.ReactNode
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  return (
    <div className="rounded-lg border border-border bg-secondary p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        {headerRight}
      </div>
      <div className="flex items-start gap-4">
        <DonutRing
          segments={segments}
          centerLabel={total > 0 ? fmtUsd(total, true) : undefined}
          activeLabel={activeLabel}
          onSegmentClick={onSegmentClick}
        />
        <div className="flex-1 space-y-1 pt-1 max-h-[140px] overflow-y-auto">
          {segments.map((seg) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0'
            const isActive = activeLabel === seg.label
            const isDimmed = activeLabel && !isActive
            return (
              <div
                key={seg.label}
                className={cn(
                  'flex items-center gap-2 text-xs rounded px-1 py-0.5 transition-all',
                  onSegmentClick && 'cursor-pointer hover:bg-muted/50',
                  isActive && 'bg-muted',
                  isDimmed && 'opacity-40',
                )}
                onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="flex-1 text-muted-foreground truncate">{seg.label}</span>
                {legendMode === 'pct' ? (
                  <span className="font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                ) : (
                  <span className="font-mono w-16 text-right">{fmtUsd(seg.value, true)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ModeBubble({ mode, onChange }: { mode: LegendMode; onChange: (m: LegendMode) => void }) {
  return (
    <div className="flex rounded-md border overflow-hidden text-[10px]">
      <button
        type="button"
        onClick={() => onChange('pct')}
        className={cn('px-2 py-0.5 transition-colors', mode === 'pct' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onChange('usd')}
        className={cn('px-2 py-0.5 transition-colors', mode === 'usd' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
      >
        $
      </button>
    </div>
  )
}

const CATEGORY_MAP: Record<string, 'stocks' | 'fixed_income' | 'cash_like'> = {
  'Stock': 'stocks',
  'Fixed Income': 'fixed_income',
  'Cash + Cash-like': 'cash_like',
}

export function PositionsChartsRow({ stocks, options, totalCash, onSymbolClick, onOptionClick, onCategoryClick, activeSymbol }: Props) {
  const [legendMode, setLegendMode] = useState<LegendMode>('pct')
  const [activeSymbolLocal, setActiveSymbolLocal] = useState<string | null>(null)
  const [activeOption, setActiveOption] = useState<string | null>(null)

  const effectiveActiveSymbol = activeSymbol?.toUpperCase() || activeSymbolLocal

  const assetMix = useMemo(() => buildAssetMixSegments(stocks, options, totalCash), [stocks, options, totalCash])
  const symbolDetail = useMemo(() => buildSymbolDonutSegments(stocks), [stocks])
  const optionDetail = useMemo(() => buildOptionDetailSegments(options), [options])

  const hasData = assetMix.length > 0 || symbolDetail.length > 0 || optionDetail.length > 0
  if (!hasData) return null

  function handleSymbolClick(label: string) {
    const next = effectiveActiveSymbol === label ? null : label
    setActiveSymbolLocal(next)
    onSymbolClick?.(next)
  }

  function handleOptionClick(label: string) {
    const next = activeOption === label ? null : label
    setActiveOption(next)
    onOptionClick?.(next)
  }

  function handleCategoryClick(label: string) {
    const mapped = CATEGORY_MAP[label]
    if (mapped) onCategoryClick?.(mapped)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ChartCard
        title="Asset Mix"
        segments={assetMix}
        legendMode={legendMode}
        onSegmentClick={onCategoryClick ? handleCategoryClick : undefined}
        headerRight={<ModeBubble mode={legendMode} onChange={setLegendMode} />}
      />
      <ChartCard
        title="Stock by Symbol"
        segments={symbolDetail.slice(0, 10)}
        legendMode={legendMode}
        activeLabel={effectiveActiveSymbol}
        onSegmentClick={handleSymbolClick}
      />
      <ChartCard
        title="Option by Underlying"
        segments={optionDetail.slice(0, 10)}
        legendMode={legendMode}
        activeLabel={activeOption}
        onSegmentClick={handleOptionClick}
        headerRight={<ModeBubble mode={legendMode} onChange={setLegendMode} />}
      />
    </div>
  )
}
