import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'

export const PERFORMANCE_HELP =
  'Track realized and unrealized PnL with daily drill-downs. Charts and aggregates above use Flex Trades and journal-closed executions only.'

export const EQUITY_GROWTH_INFO =
  'USD: Options, Stocks, and Cash-like use cumulative realized PnL in US dollars. Fixed Income uses cumulative signed notional (N as return) in US dollars. The % / $ toggle also switches the FI bar chart: in $, bars use that month’s total signed notional. The white Total line and the Total figure sum only the asset classes whose boxes are checked. Net PnL is always the full portfolio (all four). — %: same as USD but scaled to % of capital base; FI bars use annualized % when % is selected. Options: the dashed line in the same color is end-of-day unrealized, replotted each calendar month so its value on the first day of that month in the range equals cumulative Options realized on that day; within the month it moves by Δ unrealized vs that anchor (same daily U as the calendar, month-localized).'

export const TIME_RANGE_OPTIONS: { id: PerformanceTimeRange; label: string }[] = [
  { id: 'quarter', label: 'Quarter' },
  { id: 'halfyear', label: 'Half year' },
  { id: 'year', label: 'Year' },
  { id: '3year', label: '3 Years' },
]
