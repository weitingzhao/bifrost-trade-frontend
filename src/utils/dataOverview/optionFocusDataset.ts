export const OPTIONS_FOCUS_TABLE_IDS = [
  'option_contracts',
  'option_snapshots',
  'option_day',
  'option_min',
  'option_snapshots_with_underlying_day',
  'option_expiration_cache',
  'option_open_interest_daily',
  'report_option_atm_iv_daily',
  'report_option_max_pain_daily',
] as const

export type OptionsFocusTableId = (typeof OPTIONS_FOCUS_TABLE_IDS)[number]

export type OptionsFocusDataset =
  | 'all'
  | 'fundamental'
  | 'staging'
  | 'report'
  | OptionsFocusTableId

const FUNDAMENTAL: OptionsFocusTableId[] = [
  'option_contracts',
  'option_snapshots',
  'option_day',
  'option_min',
]
const STAGING: OptionsFocusTableId[] = [
  'option_snapshots_with_underlying_day',
  'option_expiration_cache',
  'option_open_interest_daily',
]
const REPORT: OptionsFocusTableId[] = ['report_option_atm_iv_daily', 'report_option_max_pain_daily']

export function showFocusTable(focus: OptionsFocusDataset, table: OptionsFocusTableId): boolean {
  if (focus === 'all') return true
  if (focus === 'fundamental') return FUNDAMENTAL.includes(table)
  if (focus === 'staging') return STAGING.includes(table)
  if (focus === 'report') return REPORT.includes(table)
  return focus === table
}

export function isPoolableOptionsFocus(focus: OptionsFocusDataset): boolean {
  return (
    focus === 'option_contracts' ||
    focus === 'option_snapshots' ||
    focus === 'option_day' ||
    focus === 'option_min'
  )
}
