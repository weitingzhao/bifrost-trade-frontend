import { SegmentControl, type SegmentOption } from '@/components/data-display'
import { CapabilityStatusDot } from '@/pages/settings/feed/massive/components/CapabilityStatusDot'
import type { EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function segmentOptionWithStatus(
  value: string,
  label: string,
  status: EffectiveServiceStatus,
): SegmentOption {
  return {
    value,
    label: (
      <span className="inline-flex items-center gap-1.5">
        <CapabilityStatusDot status={status} />
        <span>{label}</span>
      </span>
    ),
  }
}

export function MassiveSectionSegmentControl({
  ariaLabel,
  options,
  value,
  onChange,
  className,
}: {
  ariaLabel: string
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <SegmentControl
      ariaLabel={ariaLabel}
      options={options}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}
