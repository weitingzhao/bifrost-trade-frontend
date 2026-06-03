import { optionFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import {
  effectiveChecklistProjectStatus,
  tierOkForRow,
  tradesOkForRow,
} from '@/pages/settings/feed/massive/checklist/optionStatus'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

export function optionRowById(id: string): ChecklistRow | undefined {
  return optionFeedChecklistRows().find(r => r.id === id)
}

export function optionRowEffective(
  row: ChecklistRow,
  massiveStatus: MassiveStatusResponse | null | undefined,
): EffectiveServiceStatus {
  const configured = Boolean(massiveStatus?.configured)
  const tierOk = tierOkForRow(row, massiveStatus ?? null, configured)
  const tradesOk = tradesOkForRow(row, massiveStatus ?? null)
  let eff = effectiveChecklistProjectStatus(row, configured, tierOk, tradesOk)
  if (row.id === 'trades-quotes' || row.id === 'ws-trades' || row.id === 'flat-file-trades') {
    if (configured && (!tierOk || !tradesOk)) eff = 'not-on-tier'
  }
  if (row.id === 'fmv') {
    if (configured && !tierOk) eff = 'not-on-tier'
  }
  return eff
}
