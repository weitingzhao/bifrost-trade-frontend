import { DenseTagButton, denseEntityFilterChipClass, SegmentControl } from '@/components/data-display'
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
              <DenseTagButton
                key={cat}
                variant="category"
                size="pill"
                className={denseEntityFilterChipClass('category', active)}
                onClick={() => onToggleCategory(cat)}
                aria-pressed={active}
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
                <span className={liveFilterPillGripClass} aria-hidden>
                  ⋮⋮
                </span>
                {cat}
              </DenseTagButton>
            )
          })}
        </div>
        {categoryOrderSaving && <span className={liveFeedbackHintClass}>Saving order…</span>}
      </div>
    </div>
  )
}
