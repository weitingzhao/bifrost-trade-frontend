import type { CapabilityGroup } from '@/pages/settings/feed/massive/checklist/types'

export function stockCapabilityGroupForRowId(id: string): CapabilityGroup | null {
  if (id.startsWith('stock-ws-')) return 'ws'
  if (id.startsWith('stock-flat-')) return 'flat'
  if (id.startsWith('stock-')) return 'rest'
  return null
}
