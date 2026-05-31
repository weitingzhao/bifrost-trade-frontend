export interface QuoteItem {
  symbol?: string
  contract_key?: string
  last: number | null
  bid: number | null
  ask: number | null
  mid?: number | null
  timestamp?: number | null
  ts?: number
  change?: number | null
  sec_type?: string | null
  expiry?: string | null
  strike?: number | null
  option_right?: string | null
}

export interface OpenOrder {
  order_id?: number | null
  perm_id?: number | null
  account_id?: string | null
  symbol?: string | null
  sec_type?: string | null
  action?: string | null
  total_quantity?: number | null
  filled?: number | null
  remaining?: number | null
  limit_price?: number | null
  status?: string | null
  contract_key?: string | null
  updated_ts?: number | null
}

export interface OpenOrdersResponse {
  orders: OpenOrder[]
}

export interface WatchlistItem {
  contract_key: string
  symbol: string
  sec_type: string
  optionable: boolean
  category: string | null
  category_id: number | null
  source: string
  created_at: number
  expiry?: string | null
  strike?: number | null
  option_right?: string | null
  display_label?: string | null
}

export interface OhlcBar {
  time?: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  vwap?: number | null
}

/** Normalized bar for candlestick charts (Market /bars API). */
export interface Bar extends OhlcBar {
  ts?: number
}

export interface BarsResponse {
  bars?: OhlcBar[]
  message?: string
}

export interface WatchlistResponse {
  items: WatchlistItem[]
}

export interface QuotesResponse {
  quotes: QuoteItem[]
}

export interface DailyBenchmark {
  bar_time: number | null
  close: number | null
  prev_close: number | null
  is_today: boolean
  is_stale: boolean
}

export interface BenchmarkResponse {
  benchmarks: Record<string, DailyBenchmark>
}
