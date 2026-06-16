import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  MOMENTUM_GROUP_LABELS,
  MOMENTUM_INDICATORS,
  TIER_MAX_SCORE,
  type TierKey,
} from '@/constants/stockScreenerCatalog'
import { SEGMENT } from './segmentStyles'
import { ScreenerCard } from './ScreenerCard'
import { ScreenerConditionChip } from './ScreenerConditionChip'
import {
  screenerCardStackedChipRowClass,
  screenerChipRowClass,
  screenerGroupHeaderClass,
  screenerScoreSliderClass,
} from './stockScreenerUi'

interface Props {
  tier: TierKey
  activeIds: Set<string>
  minScore: number
  onToggle: (id: string) => void
  onMinScoreChange: (score: number) => void
  onClear: () => void
  groupedMomentum?: boolean
  indicators: readonly { id: string; label: string; group?: string }[]
}

const TIER_TITLE: Record<TierKey, string> = {
  momentum: 'Momentum',
  structure: 'Structure',
  sentiment: 'Sentiment',
}

export function TierFilterCard({
  tier,
  activeIds,
  minScore,
  onToggle,
  onMinScoreChange,
  onClear,
  groupedMomentum = false,
  indicators,
}: Props) {
  const maxScore = TIER_MAX_SCORE[tier]
  const activeCount = activeIds.size + (minScore > 0 ? 1 : 0)
  const tierChip = SEGMENT.tierChip[tier]

  const renderChips = (items: readonly { id: string; label: string }[]) => (
    <div className={cn(screenerChipRowClass, screenerCardStackedChipRowClass)}>
      {items.map(({ id, label }) => (
        <ScreenerConditionChip
          key={id}
          active={activeIds.has(id)}
          label={label}
          hueClass={tierChip}
          onToggle={() => onToggle(id)}
        />
      ))}
    </div>
  )

  return (
    <ScreenerCard
      stacked
      accentClassName={SEGMENT.tierCard[tier]}
      title={
        <>
          {TIER_TITLE[tier]}
          {activeCount > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0 font-mono text-dense-caption',
                SEGMENT.tierCountBadge[tier],
              )}
            >
              {activeCount}
            </span>
          )}
        </>
      }
      titleClassName={SEGMENT.tierTitle[tier]}
      actions={
        activeCount > 0 ? (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-dense-caption" onClick={onClear}>
            Clear
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-dense-caption text-muted-foreground">Score</span>
          <input
            type="range"
            min={0}
            max={maxScore}
            value={minScore}
            onChange={e => onMinScoreChange(Number(e.target.value))}
            className={screenerScoreSliderClass}
          />
          <span
            className={cn(
              'shrink-0 font-mono text-dense-caption tabular-nums',
              minScore > 0 && SEGMENT.tierScoreVal[tier],
            )}
          >
            {minScore}/{maxScore}
          </span>
        </div>
        {groupedMomentum ? (
          <div className="space-y-2">
            {(Object.keys(MOMENTUM_GROUP_LABELS) as Array<keyof typeof MOMENTUM_GROUP_LABELS>).map(
              g => (
                <div key={g}>
                  <p className={cn(screenerGroupHeaderClass, SEGMENT.momGroupHeader[g])}>
                    {MOMENTUM_GROUP_LABELS[g]}
                  </p>
                  {renderChips(MOMENTUM_INDICATORS.filter(ind => ind.group === g))}
                </div>
              ),
            )}
          </div>
        ) : (
          renderChips(indicators)
        )}
      </div>
    </ScreenerCard>
  )
}
