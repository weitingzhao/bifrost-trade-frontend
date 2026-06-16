import { SegmentControl, type SegmentOption } from '@/components/data-display'

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
  const options: SegmentOption[] = [
    { value: hostId, label: 'Host', disabled: !hostSelectable },
    { value: secondaryId, label: 'Secondary', disabled: !secondarySelectable },
  ]

  return (
    <SegmentControl
      size="sm"
      options={options}
      value={accountId ?? ''}
      onChange={onSelect}
      ariaLabel="IB account for model analysis"
    />
  )
}
