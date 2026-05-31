import { cn } from '@/lib/utils'
import styles from './live.module.css'

interface Props {
  hasStreamAccounts: boolean
  streamAccountFilters: Set<'host' | 'secondary'>
  onToggleAccount: (key: 'host' | 'secondary') => void
  streamCategoryOrder: string[]
  positionCategoryFilters: Set<string>
  onToggleCategory: (cat: string) => void
  onCategoryDrop: (dragged: string, dropTarget: string) => void
  categoryOrderSaving: boolean
}

export function FilterPillBar({
  hasStreamAccounts,
  streamAccountFilters,
  onToggleAccount,
  streamCategoryOrder,
  positionCategoryFilters,
  onToggleCategory,
  onCategoryDrop,
  categoryOrderSaving,
}: Props) {
  return (
    <div className={styles.filtersInline} role="toolbar" aria-label="Market Streams filters">
      {hasStreamAccounts && (
        <div className={styles.filterGroup}>
          <span className={styles.filterHint}>Account:</span>
          <div className={styles.filterPills} role="group" aria-label="Filter by stream account">
            {(['host', 'secondary'] as const).map(key => (
              <button
                key={key}
                type="button"
                className={cn(styles.filterPill, streamAccountFilters.has(key) && styles.filterPillActive)}
                onClick={() => onToggleAccount(key)}
                aria-pressed={streamAccountFilters.has(key)}
              >
                {key === 'host' ? 'Host' : 'Secondary'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.filterGroup}>
        <span className={styles.filterHint}>Category:</span>
        <div className={styles.filterPills} role="group" aria-label="Filter by position category">
          {streamCategoryOrder.map(cat => (
            <button
              key={cat}
              type="button"
              className={cn(styles.filterPill, positionCategoryFilters.has(cat) && styles.filterPillActive)}
              onClick={() => onToggleCategory(cat)}
              aria-pressed={positionCategoryFilters.has(cat)}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/x-market-streams-category', cat)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={e => {
                e.preventDefault()
                const dragged = e.dataTransfer.getData('application/x-market-streams-category')
                onCategoryDrop(dragged, cat)
              }}
            >
              <span className={styles.filterPillGrip} aria-hidden>⋮⋮</span>
              {cat}
            </button>
          ))}
        </div>
        {categoryOrderSaving && <span className={styles.feedbackHint}>Saving order…</span>}
      </div>
    </div>
  )
}
