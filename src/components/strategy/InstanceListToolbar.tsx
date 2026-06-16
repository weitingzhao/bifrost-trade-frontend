import { Button } from '@/components/ui/button'
import { SegmentControl } from '@/components/data-display'
import {
  instancesToolbarClass,
  instancesToolbarLabelClass,
} from './instances/instancesUi'

export type DetailViewMode = 'accordion' | 'multi'

interface Props {
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (mode: DetailViewMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  visible?: boolean
}

/** Standalone toolbar — prefer merged filters in InstanceListFilters. */
export function InstanceListToolbar({
  detailViewMode,
  onDetailViewModeChange,
  onExpandAll,
  onCollapseAll,
  visible = true,
}: Props) {
  if (!visible) return null

  return (
    <div className={instancesToolbarClass}>
      <span className={instancesToolbarLabelClass}>View</span>
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
      <span className={instancesToolbarLabelClass}>Groups</span>
      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onExpandAll}>
        Expand
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-dense-caption" onClick={onCollapseAll}>
        Collapse
      </Button>
    </div>
  )
}
