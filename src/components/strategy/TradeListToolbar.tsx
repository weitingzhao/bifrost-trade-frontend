import { Button } from '@/components/ui/button'
import { SegmentControl } from '@/components/data-display'
import {
  tradesToolbarClass,
  tradesToolbarLabelClass,
} from './trades/tradesUi'

export type DetailViewMode = 'accordion' | 'multi'

interface Props {
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (mode: DetailViewMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  visible?: boolean
}

/** Standalone toolbar — prefer merged filters in TradeListFilters. */
export function TradeListToolbar({
  detailViewMode,
  onDetailViewModeChange,
  onExpandAll,
  onCollapseAll,
  visible = true,
}: Props) {
  if (!visible) return null

  return (
    <div className={tradesToolbarClass}>
      <span className={tradesToolbarLabelClass}>View</span>
      <SegmentControl
        size="sm"
        ariaLabel="Detail view mode"
        value={detailViewMode}
        onChange={(v) => onDetailViewModeChange(v as DetailViewMode)}
        options={[
          { value: 'accordion', label: 'Accordion' },
          { value: 'multi', label: 'Multi' },
        ]}
      />
      <span className={tradesToolbarLabelClass}>Groups</span>
      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onExpandAll}>
        Expand
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onCollapseAll}>
        Collapse
      </Button>
    </div>
  )
}
