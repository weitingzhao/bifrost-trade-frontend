import { cn } from '@/lib/utils'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import type { ChartDonutSegment } from '@/utils/positionsCharts'
import { pnlColorClass } from '@/utils/positions'

interface Props {
  segments: ChartDonutSegment[]
  total: number
  mode: 'pct' | 'usd'
  activeLabel?: string | null
  onSegmentClick?: (label: string) => void
  dimmedUnlessActive?: boolean
  showFootnotes?: boolean
  layout?: 'row' | 'column' | 'grid2'
}

export function ChartLegend({
  segments,
  total,
  mode,
  activeLabel,
  onSegmentClick,
  dimmedUnlessActive,
  showFootnotes,
  layout = 'column',
}: Props) {
  const gridClass =
    layout === 'grid2' ? 'grid grid-cols-2 gap-x-2 gap-y-0.5' : layout === 'row' ? 'flex flex-wrap gap-1' : 'flex flex-col gap-0.5'

  return (
    <div className={cn('min-w-0 flex-1', gridClass)}>
      {segments.map((seg) => {
        const pct = total > 0 ? (seg.value / total) * 100 : 0
        const isActive = activeLabel === seg.label
        const isDimmed = dimmedUnlessActive && activeLabel && !isActive
        return (
          <div
            key={seg.label}
            className={cn(
              'rounded px-1 py-0.5 text-xs transition-opacity',
              onSegmentClick && 'cursor-pointer hover:bg-muted/50',
              isActive && 'bg-muted',
              isDimmed && 'opacity-40',
            )}
            onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
            title={seg.marketValueTooltip}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground truncate flex-1 min-w-0">{seg.label}</span>
              {mode === 'pct' ? (
                <span className="font-mono text-muted-foreground w-10 text-right shrink-0">{pct.toFixed(1)}%</span>
              ) : (
                <span className="font-mono w-14 text-right shrink-0">{fmtMvAbbrev(seg.value)}</span>
              )}
            </div>
            {showFootnotes && seg.optionDetailFoot && (
              <div className="text-[10px] pl-3.5 mt-0.5 text-muted-foreground leading-tight">
                {seg.optionDetailFoot.kind === 'stock' ? (
                  <>
                    Stock cost{' '}
                    <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
                      {seg.optionDetailFoot.costFmt}
                    </span>
                    {' · MV '}
                    <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
                      {seg.optionDetailFoot.mvFmt}
                    </span>
                  </>
                ) : (
                  <span className={cn('font-mono', footToneClass(seg.optionDetailFoot.tone))}>
                    {seg.optionDetailFoot.text}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function footToneClass(tone: 'profit' | 'loss' | 'flat'): string {
  if (tone === 'profit') return pnlColorClass(1)
  if (tone === 'loss') return pnlColorClass(-1)
  return 'text-muted-foreground'
}
