import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function OptionPlaceholderSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  evidence,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  evidence?: React.ReactNode
}) {
  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      anchorId={feedMassiveOptionSvcAnchorId(row.id)}
      evidence={
        evidence ?? (
          <span>
            {row.projectStatus === 'not-implemented'
              ? 'Not yet integrated. See Massive documentation or coverage sheet.'
              : row.verification}
          </span>
        )
      }
    />
  )
}
