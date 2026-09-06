/**
 * Which account the model band reads. A control when the page scope has both
 * accounts — core models one at a time, so the reader picks — and a plain tag
 * when the scope already names one, so the band cannot say something other
 * than the page it sits on.
 */
import { DenseTag, SegmentControl, type SegmentOption } from '@/components/data-display'
import type { ModelBandSide } from '@/utils/modelAnalysisAccounts'

interface Props {
  side: ModelBandSide | null
  hostSelectable: boolean
  secondarySelectable: boolean
  readOnly: boolean
  onSelect: (side: ModelBandSide) => void
}

const SIDE_LABEL: Record<ModelBandSide, string> = { host: 'Host', secondary: 'Secondary' }

export function ModelAnalysisAccountPills({ side, hostSelectable, secondarySelectable, readOnly, onSelect }: Props) {
  if (readOnly) {
    if (side == null) return null
    return (
      <DenseTag variant="category" size="cell" title="Follows the page scope" data-testid="model-account-tag">
        {SIDE_LABEL[side]}
      </DenseTag>
    )
  }

  const options: SegmentOption[] = [
    { value: 'host', label: SIDE_LABEL.host, disabled: !hostSelectable },
    { value: 'secondary', label: SIDE_LABEL.secondary, disabled: !secondarySelectable },
  ]

  return (
    <SegmentControl
      size="sm"
      options={options}
      value={side ?? ''}
      onChange={(v) => onSelect(v as ModelBandSide)}
      ariaLabel="IB account for model analysis"
    />
  )
}
