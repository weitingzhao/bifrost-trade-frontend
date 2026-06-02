import { segmentButtonClass, segmentGroupClass } from '@/components/data-display/segmentClasses'

interface Props {
  accountId: string | null
  hostId: string
  secondaryId: string
  hostSelectable: boolean
  secondarySelectable: boolean
  onSelect: (id: string) => void
}

export function ModelAnalysisAccountPills({
  accountId,
  hostId,
  secondaryId,
  hostSelectable,
  secondarySelectable,
  onSelect,
}: Props) {
  return (
    <div className={segmentGroupClass('sm')} role="group" aria-label="IB account for model analysis">
      <button
        type="button"
        className={segmentButtonClass(accountId === hostId, 'sm')}
        disabled={!hostSelectable}
        onClick={() => hostSelectable && onSelect(hostId)}
        title={
          hostId
            ? `Host: ${hostId}${hostSelectable ? '' : ' (not in current account list)'}`
            : 'Host account ID not configured (Settings → IB / Event account)'
        }
        aria-pressed={accountId === hostId}
      >
        Host
      </button>
      <button
        type="button"
        className={segmentButtonClass(accountId === secondaryId, 'sm')}
        disabled={!secondarySelectable}
        onClick={() => secondarySelectable && onSelect(secondaryId)}
        title={
          secondaryId
            ? `Secondary: ${secondaryId}${secondarySelectable ? '' : ' (not in current account list)'}`
            : 'Secondary account ID not configured (Settings → IB / Event account)'
        }
        aria-pressed={accountId === secondaryId}
      >
        Secondary
      </button>
    </div>
  )
}
