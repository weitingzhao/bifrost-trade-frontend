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
  /** Slightly larger primary row (Category Detail, Option Detail footnotes). */
  size?: 'compact' | 'comfortable'
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
  size = 'compact',
}: Props) {
  const comfortable = size === 'comfortable' || showFootnotes

  const gridClass =
    layout === 'grid2'
      ? cn('grid grid-cols-2 gap-x-2', comfortable ? 'gap-y-1' : 'gap-y-0.5')
      : layout === 'row'
        ? cn('flex flex-wrap', comfortable ? 'gap-1.5' : 'gap-1')
        : cn('flex flex-col', comfortable ? 'gap-1' : 'gap-0.5')

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
              'rounded px-1 py-0.5 transition-opacity',
              !comfortable && 'text-xs',
              onSegmentClick && 'cursor-pointer hover:bg-muted/50',
              isActive && 'bg-muted',
              isDimmed && 'opacity-40',
            )}
            onClick={onSegmentClick ? () => onSegmentClick(seg.label) : undefined}
            title={seg.marketValueTooltip}
          >
            <div
              className={cn(
                'grid w-full items-center gap-x-2',
                comfortable
                  ? 'grid-cols-[10px_minmax(0,1fr)_auto] text-sm leading-snug'
                  : 'grid-cols-[8px_minmax(0,1fr)_auto]',
              )}
            >
              <span
                className={cn('rounded-full shrink-0', comfortable ? 'size-2.5' : 'size-2')}
                style={{ backgroundColor: seg.color }}
              />
              <span
                className={cn(
                  'truncate min-w-0',
                  comfortable ? 'text-foreground/90 font-medium' : 'text-muted-foreground',
                )}
              >
                {seg.label}
              </span>
              {mode === 'pct' ? (
                <span
                  className={cn(
                    'font-mono min-w-[2.75rem] text-right shrink-0 tabular-nums',
                    comfortable ? 'font-semibold text-muted-foreground' : 'text-muted-foreground',
                  )}
                >
                  {pct.toFixed(1)}%
                </span>
              ) : (
                <span
                  className={cn(
                    'font-mono min-w-[3.5rem] text-right shrink-0 tabular-nums',
                    comfortable && 'font-semibold text-foreground',
                  )}
                >
                  {fmtMvAbbrev(seg.value)}
                </span>
              )}
            </div>
            {showFootnotes && seg.optionDetailFoot && (
              <div className="text-dense-caption pl-3.5 mt-0.5 text-muted-foreground leading-tight">
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
