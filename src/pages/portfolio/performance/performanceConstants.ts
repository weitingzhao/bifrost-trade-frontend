import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'

export const PERFORMANCE_HELP =
  'Track realized and unrealized PnL with daily drill-downs. Charts and aggregates above use Flex Trades and journal-closed executions only.'

export const EQUITY_GROWTH_INFO =
  'USD: Options, Stocks, and Cash-like use cumulative realized PnL in US dollars. Fixed Income uses cumulative signed notional (N as return) in US dollars. The % / $ toggle also switches the FI bar chart: in $, bars use that month’s total signed notional. The white Total line and the Total figure sum only the asset classes whose boxes are checked. Net PnL is always the full portfolio (all four). — %: same as USD but scaled to % of capital base; FI bars use annualized % when % is selected. Options: the dashed line in the same color is end-of-day unrealized, replotted each calendar month so its value on the first day of that month in the range equals cumulative Options realized on that day; within the month it moves by Δ unrealized vs that anchor (same daily U as the calendar, month-localized).'

export const CALENDAR_HELP =
  'Options: daily Realized and Unrealized (R/U)—FIFO option PnL plus prorated option–stock link slippage. Stocks / Fixed income: daily Realized is Σ realized_pnl; daily Notional is signed net trade size (qty×price) for coloring. Cash-like: Realized same; Notional is Σ |qty|×price. Unrealized is not shown for STK tabs. Category labels use GET /status (approximate on history).'

export const OTF_STK_UNREALIZED_HELP =
  'Realized: FIFO matched lots (buy vs sell) within the time range. Unrealized: open lots — long (remaining buys) is positive cost-style; short (remaining sells) is negative — opposite sign convention to option legs. Shares × price, no multiplier. Trade date uses exec date when trade_date is missing.'

export const TIME_RANGE_OPTIONS: { id: PerformanceTimeRange; label: string }[] = [
  { id: 'quarter', label: 'Quarter' },
  { id: 'halfyear', label: 'Half year' },
  { id: 'year', label: 'Year' },
  { id: '3year', label: '3 Years' },
]
