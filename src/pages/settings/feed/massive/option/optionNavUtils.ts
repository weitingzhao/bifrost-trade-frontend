import { optionFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import type { CapabilityGroup } from '@/pages/settings/feed/massive/checklist/types'
import { OPTION_REST_SECTION_ORDER } from '@/pages/settings/feed/massive/option/optionRestSections'

const REST_ID_SET = new Set<string>(OPTION_REST_SECTION_ORDER)

export function optionCapabilityGroupForRowId(id: string): CapabilityGroup | null {
  const row = optionFeedChecklistRows().find(r => r.id === id)
  if (!row) return null
  if (REST_ID_SET.has(id)) return 'rest'
  return row.group
}

const OPTION_ROWS = optionFeedChecklistRows()

export const OPTION_WS_IDS = OPTION_ROWS.filter(r => r.group === 'ws').map(r => r.id)
export const OPTION_FLAT_IDS = OPTION_ROWS.filter(r => r.group === 'flat').map(r => r.id)
export const OPTION_PROJECT_IDS = OPTION_ROWS.filter(r => r.group === 'project').map(r => r.id)
