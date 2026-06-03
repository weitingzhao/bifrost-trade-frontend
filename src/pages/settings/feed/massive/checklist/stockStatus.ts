import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { STOCK_CHECKLIST_ROWS } from './stockChecklistRows'
import type { ChecklistRow, CapabilityGroup, EffectiveServiceStatus } from './types'
import { CAPABILITY_GROUP_ORDER } from './types'

const TIER_RANK: Record<string, number> = { starter: 0, developer: 1, business: 2 }

export function tierOkForRow(
  row: ChecklistRow,
  massiveStatus: MassiveStatusResponse | null,
  configured: boolean,
): boolean {
  if (!massiveStatus || !configured) return false
  const actual = (massiveStatus.tier || 'starter').toLowerCase()
  return (TIER_RANK[actual] ?? 0) >= (TIER_RANK[row.tierMin] ?? 0)
}

export function tradesOkForRow(row: ChecklistRow, massiveStatus: MassiveStatusResponse | null): boolean {
  return !row.requiresTrades || Boolean(massiveStatus?.trades_enabled)
}

export function effectiveChecklistProjectStatus(
  row: ChecklistRow,
  configured: boolean,
  tierOk: boolean,
  tradesOk: boolean,
): EffectiveServiceStatus {
  if (row.requiresTrades) {
    if (configured && (!tierOk || !tradesOk)) return 'not-on-tier'
    return row.projectStatus
  }
  return row.projectStatus
}

export { shortServiceLabel, checklistEffectiveStatusLabel } from './displayHelpers'

export function groupedStockChecklistRows(): { group: CapabilityGroup; rows: ChecklistRow[] }[] {
  return CAPABILITY_GROUP_ORDER.map(g => ({
    group: g,
    rows: STOCK_CHECKLIST_ROWS.filter(r => r.group === g),
  })).filter(g => g.rows.length > 0)
}
