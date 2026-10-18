import { FilterChip } from '@bifrost/ui'
import { SegmentControl } from '@/components/data-display'
import { useLayout } from '@/lib/device'
import {
  STREAM_ACCOUNT_VIEW_OPTIONS,
  OPT_PREMIUM_UNIT_OPTIONS,
  type StreamAccountViewMode,
  type OptPremiumUnit,
} from '@/utils/streamAccountView'
import {
  liveFeedbackHintClass,
  liveFilterGroupClass,
  liveFilterHintClass,
  liveFilterPillGripClass,
  liveFilterPillsClass,
  liveFiltersInlineClass,
} from './liveUi'
import { pillMoves } from './liveMoves'
import { LiveMoveMenu } from './LiveMoveMenu'
import { useLiveMoveMenu } from './useLiveMoveMenu'

interface Props {
  hasStreamAccounts: boolean
  accountViewMode: StreamAccountViewMode
  onAccountViewModeChange: (mode: StreamAccountViewMode) => void
  optPremiumUnit: OptPremiumUnit
  onOptPremiumUnitChange: (unit: OptPremiumUnit) => void
  streamCategoryOrder: string[]
  positionCategoryFilters: Set<string>
  onToggleCategory: (cat: string) => void
  onCategoryDrop: (dragged: string, dropTarget: string) => void
  categoryOrderSaving: boolean
}

export function FilterPillBar({
  hasStreamAccounts,
  accountViewMode,
  onAccountViewModeChange,
  optPremiumUnit,
  onOptPremiumUnitChange,
  streamCategoryOrder,
  positionCategoryFilters,
  onToggleCategory,
  onCategoryDrop,
  categoryOrderSaving,
}: Props) {
  // Rev .175 (§18.3): under a finger a chip is not dragged — a long press on
  // an HTML-draggable element lifts it instead of opening a menu — so on touch
  // the order moves through the chip's menu (Move left · Move right), which
  // calls the same drop handler. The pointer keeps drag and gets the menu too.
  const touch = useLayout().input === 'touch'
  const move = useLiveMoveMenu()
  return (
    <div className={liveFiltersInlineClass} role="toolbar" aria-label="Market Streams filters">
      {hasStreamAccounts && (
        <div className={liveFilterGroupClass}>
          <span className={liveFilterHintClass}>Account:</span>
          <SegmentControl
            size="sm"
            ariaLabel="Account column display mode"
            value={accountViewMode}
            onChange={v => onAccountViewModeChange(v as StreamAccountViewMode)}
            options={STREAM_ACCOUNT_VIEW_OPTIONS.map(o => ({
              value: o.value,
              label: <span title={o.title}>{o.label}</span>,
            }))}
          />
        </div>
      )}
      <div className={liveFilterGroupClass}>
        <span className={liveFilterHintClass}>Opt unit:</span>
        <SegmentControl
          size="sm"
          ariaLabel="Option premium display unit"
          value={optPremiumUnit}
          onChange={v => onOptPremiumUnitChange(v as OptPremiumUnit)}
          options={OPT_PREMIUM_UNIT_OPTIONS.map(o => ({
            value: o.value,
            label: <span title={o.title}>{o.label}</span>,
          }))}
        />
      </div>
      <div className={liveFilterGroupClass}>
        <span className={liveFilterHintClass}>Category:</span>
        <div className={liveFilterPillsClass} role="group" aria-label="Filter by position category">
          {streamCategoryOrder.map(cat => {
            const active = positionCategoryFilters.has(cat)
            return (
              // §17.10 (Owner #14, Rev .150): a category is a filter chip — on is
              // ink 15%, never the category's entity colour. Drag to reorder, or
              // Move left · Move right from its menu.
              <FilterChip
                key={cat}
                pressed={active}
                onPressedChange={() => onToggleCategory(cat)}
                onContextMenu={e =>
                  move.onMenu(e, {
                    label: cat,
                    items: pillMoves(streamCategoryOrder, cat),
                    onMove: onCategoryDrop,
                  })
                }
                draggable={!touch}
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
                <span data-sr-hide="touch" className={liveFilterPillGripClass} aria-hidden>
                  ⋮⋮
                </span>
                {cat}
              </FilterChip>
            )
          })}
        </div>
        {categoryOrderSaving && <span className={liveFeedbackHintClass}>Saving order…</span>}
      </div>
      <LiveMoveMenu at={move.at} onClose={move.close} />
    </div>
  )
}
