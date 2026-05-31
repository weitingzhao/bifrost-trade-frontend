import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  MOMENTUM_GROUP_LABELS,
  MOMENTUM_INDICATORS,
  TIER_MAX_SCORE,
  type TierKey,
} from '@/constants/stockScreenerCatalog'
import { SEGMENT } from './segmentStyles'
import styles from './stock-screener.module.css'

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
    <div className={styles.ssChipRow}>
      {items.map(({ id, label }) => {
        const active = activeIds.has(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={cn(styles.ssChip, tierChip, active && styles.ssChipActive)}
          >
            <span className={styles.ssChipCheck} aria-hidden>{active ? '✓' : ''}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={cn(styles.ssCard, styles.ssCardStacked, SEGMENT.tierCard[tier])}>
      <div className="flex flex-row items-center justify-between gap-2 mb-2">
        <h3 className={cn(styles.ssCardTitle, SEGMENT.tierTitle[tier], 'flex items-center gap-1.5')}>
          {TIER_TITLE[tier]}
          {activeCount > 0 && (
            <span className={cn('text-[10px] px-1.5 py-0 rounded-full font-mono', SEGMENT.tierCountBadge[tier])}>
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Score</span>
          <input
            type="range"
            min={0}
            max={maxScore}
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className={styles.ssScoreSlider}
          />
          <span className={cn(
            'text-[10px] font-mono tabular-nums shrink-0',
            minScore > 0 && SEGMENT.tierScoreVal[tier],
          )}>
            {minScore}/{maxScore}
          </span>
        </div>
        {groupedMomentum ? (
          <div className="space-y-2">
            {(Object.keys(MOMENTUM_GROUP_LABELS) as Array<keyof typeof MOMENTUM_GROUP_LABELS>).map((g) => (
              <div key={g}>
                <p className={cn(styles.ssGroupHeader, SEGMENT.momGroupHeader[g])}>
                  {MOMENTUM_GROUP_LABELS[g]}
                </p>
                {renderChips(MOMENTUM_INDICATORS.filter((ind) => ind.group === g))}
              </div>
            ))}
          </div>
        ) : (
          renderChips(indicators)
        )}
      </div>
    </div>
  )
}
