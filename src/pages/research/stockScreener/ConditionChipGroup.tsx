import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SEGMENT } from './segmentStyles'
import { ScreenerCard } from './ScreenerCard'
import { ScreenerConditionChip } from './ScreenerConditionChip'
import {
  screenerCardStackedChipRowClass,
  screenerChipRowClass,
  screenerGroupHeaderClass,
} from './stockScreenerUi'

interface ChipItem {
  id: string
  label: string
  chipClass?: string
}

interface Group {
  key: string
  label: string
  items: ChipItem[]
  headerClass?: string
}

interface Props {
  title: string
  groups: Group[]
  activeIds: Set<string>
  onToggle: (id: string) => void
  onClearGroup?: (groupKey: string) => void
  onClearAll?: () => void
  /** Extended fund mini-cards get left border + colored title */
  cardAccentKey?: string
  stacked?: boolean
}

export function ConditionChipGroup({
  title,
  groups,
  activeIds,
  onToggle,
  onClearGroup,
  onClearAll,
  cardAccentKey,
  stacked = false,
}: Props) {
  const totalActive = activeIds.size
  const cardAccent = cardAccentKey ? SEGMENT.extCard[cardAccentKey] : undefined
  const titleAccent = cardAccentKey ? SEGMENT.extTitle[cardAccentKey] : undefined

  const clearAction =
    totalActive > 0 && onClearAll && !cardAccentKey ? (
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onClearAll}>
        Clear
      </Button>
    ) : cardAccentKey && totalActive > 0 && onClearGroup && groups.length === 1 ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px]"
        onClick={() => onClearGroup(groups[0].key)}
      >
        Clear
      </Button>
    ) : undefined

  return (
    <ScreenerCard
      title={title}
      titleClassName={titleAccent}
      accentClassName={cardAccent}
      stacked={stacked}
      badgeCount={totalActive > 0 ? totalActive : undefined}
      actions={clearAction}
    >
      <div className="space-y-2">
        {groups.map(g => {
          const groupActive = g.items.filter(c => activeIds.has(c.id)).length
          const hideInnerHeader = cardAccentKey != null
          return (
            <div key={g.key}>
              {!hideInnerHeader && (
                <div className="mb-1 flex items-center gap-1">
                  <span className={cn(screenerGroupHeaderClass, g.headerClass)}>{g.label}</span>
                  {groupActive > 0 && onClearGroup && (
                    <button
                      type="button"
                      className="text-[9px] text-muted-foreground underline hover:text-foreground"
                      onClick={() => onClearGroup(g.key)}
                    >
                      clear
                    </button>
                  )}
                </div>
              )}
              <div
                className={cn(
                  screenerChipRowClass,
                  stacked && screenerCardStackedChipRowClass,
                )}
              >
                {g.items.map(({ id, label, chipClass }) => (
                  <ScreenerConditionChip
                    key={id}
                    active={activeIds.has(id)}
                    label={label}
                    hueClass={chipClass}
                    onToggle={() => onToggle(id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScreenerCard>
  )
}
