export interface QuoteItem {
  symbol?: string
  contract_key?: string
  last: number | null
  bid: number | null
  ask: number | null
  mid?: number | null
  timestamp?: number | null
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
