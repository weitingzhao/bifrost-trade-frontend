import { SegmentControl } from '@/components/data-display'

export type StrikeSideMode = 'all' | 'call' | 'put'

export function DiscoverySideToggle({
  value,
  onChange,
  id,
  'aria-labelledby': ariaLabelledBy,
}: {
  value: StrikeSideMode
  onChange: (mode: StrikeSideMode) => void
  id?: string
  'aria-labelledby'?: string
}) {
  return (
    <div id={id} aria-labelledby={ariaLabelledBy}>
      <SegmentControl
        ariaLabel={ariaLabelledBy ? undefined : 'Strike side filter'}
        value={value}
        onChange={v => {
          if (v === 'all' || v === 'call' || v === 'put') onChange(v)
        }}
        options={[
          { value: 'all', label: 'All' },
          { value: 'call', label: 'Call' },
          { value: 'put', label: 'Put' },
        ]}
      />
    </div>
  )
}
