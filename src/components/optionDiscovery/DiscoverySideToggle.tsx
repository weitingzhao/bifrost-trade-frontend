import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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
    <ToggleGroup
      id={id}
      type="single"
      size="sm"
      variant="outline"
      value={value}
      onValueChange={v => {
        if (v === 'all' || v === 'call' || v === 'put') onChange(v)
      }}
      aria-labelledby={ariaLabelledBy}
    >
      <ToggleGroupItem value="all" aria-label="All sides">
        All
      </ToggleGroupItem>
      <ToggleGroupItem value="call" aria-label="Calls only">
        Call
      </ToggleGroupItem>
      <ToggleGroupItem value="put" aria-label="Puts only">
        Put
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
