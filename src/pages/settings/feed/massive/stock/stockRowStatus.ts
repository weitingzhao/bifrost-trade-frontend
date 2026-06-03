import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { STOCK_CHECKLIST_ROWS } from '@/pages/settings/feed/massive/checklist/stockChecklistRows'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import {
  effectiveChecklistProjectStatus,
  tierOkForRow,
  tradesOkForRow,
} from '@/pages/settings/feed/massive/checklist/stockStatus'

export function stockRowById(id: string): ChecklistRow | undefined {
  return STOCK_CHECKLIST_ROWS.find(r => r.id === id)
}

export function stockRowEffective(
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
