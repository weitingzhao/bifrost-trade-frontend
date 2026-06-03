import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { OPTION_CHECKLIST_ROWS } from './optionChecklistRows'
import type { ChecklistRow, CapabilityGroup, EffectiveServiceStatus } from './types'
import { CAPABILITY_GROUP_ORDER } from './types'

/** Shared REST capabilities live on Feed → Massive Common only. */
export const MASSIVE_COMMON_CAP_IDS = ['technical-indicators', 'market-ops'] as const
const COMMON_CAP_ID_SET = new Set<string>(MASSIVE_COMMON_CAP_IDS)

export function optionFeedChecklistRows(): ChecklistRow[] {
  return OPTION_CHECKLIST_ROWS.filter(r => !COMMON_CAP_ID_SET.has(r.id))
}

export function commonFeedChecklistRows(): ChecklistRow[] {
  return OPTION_CHECKLIST_ROWS.filter(r => COMMON_CAP_ID_SET.has(r.id))
}

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
  if (row.id === 'trades-quotes' || row.id === 'trades') {
    if (configured && (!tierOk || !tradesOk)) return 'not-on-tier'
    return row.projectStatus
  }
  if (row.id === 'fmv') {
    if (configured && !tierOk) return 'not-on-tier'
    return row.projectStatus
  }
  return row.projectStatus
}

export function shortServiceLabel(row: ChecklistRow): string {
  const s = row.service.trim()
  if (s.length <= 22) return s
  return `${s.slice(0, 20)}…`
}

export function checklistEffectiveStatusLabel(eff: EffectiveServiceStatus): string {
  if (eff === 'implemented') return 'Implemented'
  if (eff === 'partial') return 'Partial'
  if (eff === 'not-on-tier') return 'Not on tier'
  return 'Not implemented'
}

export function groupedOptionFeedChecklistRows(): { group: CapabilityGroup; rows: ChecklistRow[] }[] {
  return CAPABILITY_GROUP_ORDER.map(g => ({
    group: g,
    rows: optionFeedChecklistRows().filter(r => r.group === g),
  })).filter(g => g.rows.length > 0)
}

export function groupedCommonFeedChecklistRows(): { group: CapabilityGroup; rows: ChecklistRow[] }[] {
  return CAPABILITY_GROUP_ORDER.map(g => ({
    group: g,
    rows: commonFeedChecklistRows().filter(r => r.group === g),
  })).filter(g => g.rows.length > 0)
}
