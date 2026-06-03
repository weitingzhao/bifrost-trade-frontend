import { SegmentControl } from '@/components/data-display'
import type { CapabilityGroup } from '@/pages/settings/feed/massive/checklist/types'

export type StockChannelTab = 'rest' | 'ws' | 'flat'

const CHANNEL_OPTIONS: { value: StockChannelTab; label: string }[] = [
  { value: 'rest', label: 'REST' },
  { value: 'ws', label: 'WebSocket' },
  { value: 'flat', label: 'Flat Files' },
]

export function stockCapabilityGroupForRowId(id: string): CapabilityGroup | null {
  if (id.startsWith('stock-ws-')) return 'ws'
  if (id.startsWith('stock-flat-')) return 'flat'
  if (id.startsWith('stock-')) return 'rest'
  return null
}

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
