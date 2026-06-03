import { Link } from 'react-router-dom'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function StockPlaceholderSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  linkToOption,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  /** Corporate actions sync lives on Massive Option page. */
  linkToOption?: boolean
}) {
  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      evidence={
        linkToOption ? (
          <span>
            Sync UI:{' '}
            <Link to="/settings/feed/massive-option#feed-massive-svc-corporate-actions" className="text-primary hover:underline">
              Feed → Massive Option → Corporate actions
            </Link>
          </span>
        ) : (
          <span>Not yet implemented for stocks. See coverage sheet for target endpoints.</span>
        )
      }
    />
  )
}
