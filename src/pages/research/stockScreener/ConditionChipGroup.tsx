import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SEGMENT } from './segmentStyles'
import styles from './stock-screener.module.css'

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

  return (
    <div
      className={cn(
        styles.ssCard,
        stacked && styles.ssCardStacked,
        cardAccent,
      )}
    >
      <div className="flex flex-row items-center justify-between gap-2 mb-2">
        <h3 className={cn(styles.ssCardTitle, titleAccent, 'flex items-center gap-1.5')}>
          {title}
          {totalActive > 0 && (
            <span className={styles.ssFilterBadge}>{totalActive}</span>
          )}
        </h3>
        {totalActive > 0 && onClearAll && !cardAccentKey && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onClearAll}>
            Clear
          </Button>
        )}
        {cardAccentKey && totalActive > 0 && onClearGroup && groups.length === 1 && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onClearGroup(groups[0].key)}>
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {groups.map((g) => {
          const groupActive = g.items.filter((c) => activeIds.has(c.id)).length
          const hideInnerHeader = cardAccentKey != null
          return (
            <div key={g.key}>
              {!hideInnerHeader && (
                <div className="flex items-center gap-1 mb-1">
                  <span className={cn(styles.ssGroupHeader, g.headerClass)}>
                    {g.label}
                  </span>
                  {groupActive > 0 && onClearGroup && (
                    <button
                      type="button"
                      className="text-[9px] text-muted-foreground hover:text-foreground underline"
                      onClick={() => onClearGroup(g.key)}
                    >
                      clear
                    </button>
                  )}
                </div>
              )}
              <div className={styles.ssChipRow}>
                {g.items.map(({ id, label, chipClass }) => {
                  const active = activeIds.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onToggle(id)}
                      title={active ? `Remove ${label}` : `Add ${label}`}
                      className={cn(
                        styles.ssChip,
                        chipClass,
                        active && styles.ssChipActive,
                      )}
                    >
                      <span className={styles.ssChipCheck} aria-hidden>{active ? '✓' : ''}</span>
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
