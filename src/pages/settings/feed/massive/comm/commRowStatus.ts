import { commonFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import {
  effectiveChecklistProjectStatus,
  tierOkForRow,
  tradesOkForRow,
} from '@/pages/settings/feed/massive/checklist/optionStatus'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

export function commRowById(id: string): ChecklistRow | undefined {
  return commonFeedChecklistRows().find(r => r.id === id)
}

export function commRowEffective(
  row: ChecklistRow,
  massiveStatus: MassiveStatusResponse | null | undefined,
): EffectiveServiceStatus {
  const configured = Boolean(massiveStatus?.configured)
  return effectiveChecklistProjectStatus(
    row,
    configured,
    tierOkForRow(row, massiveStatus ?? null, configured),
    tradesOkForRow(row, massiveStatus ?? null),
  )
}
