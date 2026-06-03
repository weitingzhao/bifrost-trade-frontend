import { SegmentControl, type SegmentOption } from '@/components/data-display'

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
