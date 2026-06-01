import { cn } from '@/lib/utils'
import {
  liveFeedbackHintClass,
  liveFilterGroupClass,
  liveFilterHintClass,
  liveFilterPillActiveClass,
  liveFilterPillClass,
  liveFilterPillGripClass,
  liveFilterPillsClass,
  liveFiltersInlineClass,
} from './liveUi'

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
    <div className={liveFiltersInlineClass} role="toolbar" aria-label="Market Streams filters">
      {hasStreamAccounts && (
        <div className={liveFilterGroupClass}>
          <span className={liveFilterHintClass}>Account:</span>
          <div className={liveFilterPillsClass} role="group" aria-label="Filter by stream account">
            {(['host', 'secondary'] as const).map(key => (
              <button
                key={key}
                type="button"
                className={cn(liveFilterPillClass, streamAccountFilters.has(key) && liveFilterPillActiveClass)}
                onClick={() => onToggleAccount(key)}
                aria-pressed={streamAccountFilters.has(key)}
              >
                {key === 'host' ? 'Host' : 'Secondary'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={liveFilterGroupClass}>
        <span className={liveFilterHintClass}>Category:</span>
        <div className={liveFilterPillsClass} role="group" aria-label="Filter by position category">
          {streamCategoryOrder.map(cat => (
            <button
              key={cat}
              type="button"
              className={cn(liveFilterPillClass, positionCategoryFilters.has(cat) && liveFilterPillActiveClass)}
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
              <span className={liveFilterPillGripClass} aria-hidden>⋮⋮</span>
              {cat}
            </button>
          ))}
        </div>
        {categoryOrderSaving && <span className={liveFeedbackHintClass}>Saving order…</span>}
      </div>
    </div>
  )
}
