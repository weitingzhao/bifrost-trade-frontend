import { SegmentControl } from '@/components/data-display'
export type StockChannelTab = 'rest' | 'ws' | 'flat'

const CHANNEL_OPTIONS: { value: StockChannelTab; label: string }[] = [
  { value: 'rest', label: 'REST' },
  { value: 'ws', label: 'WebSocket' },
  { value: 'flat', label: 'Flat Files' },
]

export function MassiveDeliveryChannelTabs({
  value,
  onChange,
}: {
  value: StockChannelTab
  onChange: (v: StockChannelTab) => void
}) {
  return (
    <SegmentControl
      ariaLabel="Delivery channel"
      options={CHANNEL_OPTIONS}
      value={value}
      onChange={v => onChange(v as StockChannelTab)}
    />
  )
}
